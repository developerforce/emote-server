'use strict'

require('dotenv').config()
const path = require('path')
const Redis = require('ioredis')
const fastify = require('fastify')
const fastifyStatic = require('fastify-static')
const fastifyRateLimit = require('fastify-rate-limit')
const { FastifySSEPlugin } = require('fastify-sse-v2')
const fastifyCors = require('fastify-cors')
const { EventEmitter } = require('events')
const { EventIterator } = require('event-iterator')

const PORT = process.env.PORT || 8080
const REDIS_URL = process.env.REDIS_URL
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || '1 minute'
const HEARTBEAT_TIMEOUT = process.env.HEARTBEAT_TIMEOUT || 30

const cache = new Redis(REDIS_URL)
const pub = new Redis(REDIS_URL)
const sub = new Redis(REDIS_URL)
const events = new EventEmitter()

const server = fastify({
  trustProxy: true,
  logger: {
    prettyPrint: true
  }
})
server.register(fastifyRateLimit, {
  global: false,
  redis: cache
})
server.register(fastifyStatic, {
  root: path.join(__dirname, 'public')
})
server.register(FastifySSEPlugin)
server.register(fastifyCors)

// Register to an Event by id
server.get('/events/emote/:id', (request, reply) => {
  // fastify-cors doesn't seem to work with fastify-sse-v2
  // so we need to add this header to this route manually
  reply.raw.setHeader('Access-Control-Allow-Origin', '*')

  const id = request.params.id
  const eventIterator = new EventIterator(({ push }) => {
    server.log.info(`Listening for emote events, id: ${id}`)
    const hb = heartbeat(id)
    events.on(`emote:${id}`, push)
    events.on(`heartbeat:${id}`, push)
    events.on(`votes:${id}`, push)
    return () => {
      server.log.info(`Cleaning up timers and events for id: ${id}`)
      events.removeEventListener(`emote:${id}`)
      events.removeEventListener(`heartbeat:${id}`)
      events.removeEventListener(`votes:${id}`)
      clearInterval(hb)
    }
  })
  reply.sse(eventIterator)
})

// Get the current state by id
server.get('/api/emote/:id', async (request, reply) => {
  const id = request.params.id
  let votes = {}
  try {
    votes = await getVotes(id)
  } catch (err) {
    server.log.error(err)
  }
  reply.send(votes)
})

// Send a emote event by id
// body: {"emote": "keyword"}
server.post('/api/emote/:id', {
  config: {
    rateLimit: {
      max: RATE_LIMIT_MAX,
      timeWindow: RATE_LIMIT_WINDOW
    }
  }
}, async (request, reply) => {
  const id = request.params.id
  const emote = request.body.emote
  try {
    await vote(id, emote)
  } catch (err) {
    server.log.error(err)
  }
  const message = {
    event: `emote:${id}`,
    data: {
      id,
      event: 'emote',
      data: emote
    }
  }
  pub.publish('emote', JSON.stringify(message))
  reply.send({ message: 'emote received' })
})

/**
 * Start a heatbeat function and report votes by event
 *
 * @param {String} id - Event ID
 */
function heartbeat (id) {
  server.log.info(`Starting heartbeat for event id: ${id}`)
  return setInterval(async () => {
    const votes = await getVotes(id)
    events.emit(`heartbeat:${id}`, {
      id,
      event: 'heartbeat',
      data: 'ping'
    })
    events.emit(`votes:${id}`, {
      id,
      event: 'votes',
      data: JSON.stringify(votes)
    })
  }, HEARTBEAT_TIMEOUT * 1000)
}

/**
 * Get Votes by Event ID
 *
 * @param {String} id - Event ID
 * @returns {Promise<any>} Object with emotes and votes
 */
function getVotes (id) {
  return cache.hgetall(id)
}

/**
 * Vote on an emote by Event ID
 *
 * @param {String} id - EventID
 * @param {String} emote - Emote code
 * @returns {Promise<any>}
 */
function vote (id, emote) {
  return cache.hincrby(id, emote, 1)
}

/**
 * Start Server
 */
async function start () {
  const address = await server.listen(PORT, '0.0.0.0')

  await sub.subscribe('emote')
  sub.on('message', (channel, message) => {
    if (channel === 'emote') {
      try {
        const { event, data } = JSON.parse(message)
        events.emit(event, data)
      } catch (err) {
        server.info.error(err)
      }
    }
  })

  server.log.info(`Server listening on ${address}`)
}

start().catch(err => {
  server.log.error(err)
  process.exit(1)
})
