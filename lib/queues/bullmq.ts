import "server-only";
import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

const QUEUE_NAME_SIMULATIONS = "simulations";

let redisClient: IORedis | null | undefined;
let simulationQueue: Queue | null | undefined;

function parseRedisPort(value: string | undefined): number | null {
  if (!value?.trim()) return null;

  const port = Number(value.trim());
  return Number.isInteger(port) && port > 0 ? port : null;
}

function getRedisUrl(): string | null {
  const value = process.env.REDIS_URL?.trim();
  return value || null;
}

function getRedisHost(): string | null {
  const value = process.env.REDIS_HOST?.trim();
  return value || null;
}

function getRedisPort(): number | null {
  return parseRedisPort(process.env.REDIS_PORT);
}

function getRedisOptions() {
  return {
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    lazyConnect: true,
  };
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl() || (getRedisHost() && getRedisPort()));
}

export function getRedisConnection(): ConnectionOptions | null {
  const redisUrl = getRedisUrl();
  if (redisUrl) {
    return {
      url: redisUrl,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    } as ConnectionOptions;
  }

  const host = getRedisHost();
  const port = getRedisPort();

  if (host && port) {
    return {
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    } as ConnectionOptions;
  }

  return null;
}

export function getRedisClient(): IORedis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const redisUrl = getRedisUrl();
  const host = getRedisHost();
  const port = getRedisPort();
  const options = getRedisOptions();

  if (redisUrl) {
    redisClient = new IORedis(redisUrl, options);
    return redisClient;
  }

  if (host && port) {
    redisClient = new IORedis(port, host, options);
    return redisClient;
  }

  redisClient = null;
  return redisClient;
}

export function getSimulationQueue(): Queue | null {
  if (simulationQueue !== undefined) {
    return simulationQueue;
  }

  const connection = getRedisConnection();

  if (!connection) {
    simulationQueue = null;
    return simulationQueue;
  }

  simulationQueue = new Queue(QUEUE_NAME_SIMULATIONS, {
    connection,
  });

  return simulationQueue;
}

export async function closeBullMqResources(): Promise<void> {
  const closeTasks: Promise<unknown>[] = [];

  if (simulationQueue) {
    closeTasks.push(simulationQueue.close());
    simulationQueue = undefined;
  }

  if (redisClient) {
    closeTasks.push(redisClient.quit().catch(() => redisClient?.disconnect()));
    redisClient = undefined;
  }

  await Promise.all(closeTasks);
}