'use strict'

require('dotenv').config()
const path = require('path')
const Redis = require('ioredis')
const fastify = require('fastify')
const fastifyStatic = require('fastify-static')
const { FastifySSEPlugin } = require('fastify-sse-v2')
const { EventEmitter } = require('events')
const { EventIterator } = require('event-iterator')
const port = process.env.PORT || 8080

const pub = new Redis(process.env.REDIS_URL)
const sub = new Redis(process.env.REDIS_URL)
const events = new EventEmitter()

const server = fastify({
  logger: {
    prettyPrint: true
  }
})

server.register(fastifyStatic, {
  root: path.join(__dirname, 'public')
})
server.register(FastifySSEPlugin)

server.get('/events/feedback/:id', (request, reply) => {
  const id = request.params.id
  const eventIterator = new EventIterator(({ push }) => {
    server.log.info(`Listening for feedback events, id: ${id}`)
    const hb = heartbeat(id)
    events.on(`feedback:${id}`, push)
    events.on(`heartbeat:${id}`, push)
    return () => {
      server.log.info(`Cleaning up timers and events for id: ${id}`)
      events.removeEventListener(`feedback:${id}`)
      events.removeEventListener(`heartbeat:${id}`)
      clearInterval(hb)
    }
  })
  reply.sse(eventIterator)
})

server.post('/api/feedback/:id', (request, reply) => {
  const id = request.params.id
  const feedback = request.body.feedback
  const message = {
    event: `feedback:${id}`,
    data: {
      id,
      event: 'feedback',
      data: feedback
    }
  }
  pub.publish('feedback', JSON.stringify(message))
  reply.send({ message: 'feedback received' })
})

function heartbeat (id) {
  server.log.info(`Starting heartbeat for id: ${id}`)
  return setInterval(() => {
    events.emit(`heartbeat:${id}`, { id, event: 'heartbeat', data: 'ping' })
  }, 30 * 1000)
}

async function start () {
  const address = await server.listen(port, '0.0.0.0')

  await sub.subscribe('feedback')
  sub.on('message', (channel, message) => {
    if (channel === 'feedback') {
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
