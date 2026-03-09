import { Queue } from "bullmq"
import IORedis from "ioredis"

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1"
const REDIS_PORT = Number(process.env.REDIS_PORT || "6000")
const REDIS_URL = process.env.REDIS_URL?.trim()

const redisOptions = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  lazyConnect: true,
}

function createRedisClient() {
  if (REDIS_URL) {
    return new IORedis(REDIS_URL, redisOptions)
  }

  if (process.env.REDIS_HOST || process.env.REDIS_PORT) {
    return new IORedis(REDIS_PORT, REDIS_HOST, redisOptions)
  }

  return null
}

export const redis = createRedisClient()

export const redisConnection = REDIS_URL
  ? {
      host: undefined,
      port: undefined,
      url: REDIS_URL,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  : process.env.REDIS_HOST || process.env.REDIS_PORT
  ? {
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  : null

export const simulationQueue = redisConnection
  ? new Queue("simulations", {
      connection: redisConnection,
    })
  : null