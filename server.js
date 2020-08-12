'use strict'

require('dotenv').config()
const path = require('path')
const Redis = require('ioredis')
const fastify = require('fastify')
const fastifyStatic = require('fastify-static')
const fastifyRateLimit = require('fastify-rate-limit')
const { FastifySSEPlugin } = require('fastify-sse-v2')
const { EventEmitter } = require('events')
const { EventIterator } = require('event-iterator')

/**
 * Configuration Options
 */
const {
  PORT,
  REDIS_URL,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  HEARTBEAT_TIMEOUT,
  EMOTE_ALLOWLIST,
  EVENT_ID_LENGTH,
  EVENTS_MAX
} = require('./config')

/**
 * Initialize Redis and Event Handlers
 */
const cache = new Redis(REDIS_URL)
const pub = new Redis(REDIS_URL)
const sub = new Redis(REDIS_URL)
const events = new EventEmitter()

/**
 * Create Server and Register Plugins
 */
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

/**
 * Validation Schemas
 */
const paramsSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: EVENT_ID_LENGTH
    }
  }
}

const bodySchema = {
  type: 'object',
  required: ['emote'],
  properties: {
    emote: {
      type: 'string',
      enum: EMOTE_ALLOWLIST
    }
  }
}

/**
 * API Routes
 */

/**
 * Register to an Event Stream by Event ID
 */
server.get('/events/emote/:id', {
  schema: {
    params: paramsSchema
  }
}, (request, reply) => {
  const id = request.params.id
  const eventIterator = new EventIterator(({ push }) => {
    server.log.info(`Listening for emote events, id: ${id}`)
    const hb = heartbeat(id)
    events.on(`emote:${id}`, push)
    events.on(`heartbeat:${id}`, push)
    events.on(`votes:${id}`, push)
    return () => {
      server.log.info(`Cleaning up timers and events for Event ID: ${id}`)
      events.removeEventListener(`emote:${id}`)
      events.removeEventListener(`heartbeat:${id}`)
      events.removeEventListener(`votes:${id}`)
      clearInterval(hb)
    }
  })
  reply.sse(eventIterator)
})

/**
 * Get the current votes by Event ID
 */
server.get('/api/emote/:id', {
  schema: {
    params: paramsSchema
  }
}, async (request, reply) => {
  const id = request.params.id
  let votes = {}
  try {
    votes = await getVotes(id)
  } catch (err) {
    server.log.error(err)
  }
  reply.send(votes)
})

/**
 * Send a emote by Event ID
 */
server.post('/api/emote/:id', {
  config: {
    rateLimit: {
      max: RATE_LIMIT_MAX,
      timeWindow: RATE_LIMIT_WINDOW
    }
  },
  schema: {
    body: bodySchema,
    params: paramsSchema
  }
}, async (request, reply) => {
  const id = request.params.id
  const emote = request.body.emote

  try {
    await saveEvent(id)
    await vote(id, emote)
  } catch (err) {
    server.log.error(err)
    reply.statusCode = 400
    reply.send({ error: `Can't submit vote: ${err.message}` })
    return
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
 * Save an Event in Redis
 *
 * @param {String} id - Event ID
 * @returns {Promise<any>}
 */
async function saveEvent (id) {
  const total = await cache.scard('events')

  if (total >= EVENTS_MAX) {
    return Promise.reject(new Error('Max Events Reached'))
  }

  return cache.sadd('events', id)
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
