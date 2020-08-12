'use strict'

const PORT = process.env.PORT || 8080
const REDIS_URL = process.env.REDIS_URL
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || '1 minute'
const HEARTBEAT_TIMEOUT = process.env.HEARTBEAT_TIMEOUT || 30
const EMOTE_ALLOWLIST = [
  'tada',
  'love',
  'laugh',
  'plus_one',
  'question'
]

module.exports = {
  PORT,
  REDIS_URL,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  HEARTBEAT_TIMEOUT,
  EMOTE_ALLOWLIST
}
