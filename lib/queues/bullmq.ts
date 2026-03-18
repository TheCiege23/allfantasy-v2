import "server-only";
import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES } from "@/lib/jobs/types";

const QUEUE_NAME_SIMULATIONS = QUEUE_NAMES.SIMULATIONS;

let redisClient: IORedis | null | undefined;
let simulationQueueInstance: Queue | null | undefined;
const queuesByName = new Map<string, Queue>();

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

/**
 * Get or create a queue by name. Use for ai, notifications, simulations.
 */
export function getQueue(name: string): Queue | null {
  const connection = getRedisConnection();
  if (!connection) return null;

  let q = queuesByName.get(name);
  if (q) return q;

  q = new Queue(name, { connection });
  queuesByName.set(name, q);
  return q;
}

export function getSimulationQueue(): Queue | null {
  if (simulationQueueInstance !== undefined) {
    return simulationQueueInstance;
  }

  const connection = getRedisConnection();

  if (!connection) {
    simulationQueueInstance = null;
    return simulationQueueInstance;
  }

  simulationQueueInstance = new Queue(QUEUE_NAME_SIMULATIONS, {
    connection,
  });

  return simulationQueueInstance;
}

export function getAiQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.AI);
}

export function getNotificationsQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.NOTIFICATIONS);
}

export function getDevyQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.DEVY);
}

/**
 * Named exports to support existing route imports like:
 * import { simulationQueue, redis } from "@/lib/queues/bullmq"
 */
export const redis = getRedisClient();
export const simulationQueue = getSimulationQueue();

export async function closeBullMqResources(): Promise<void> {
  const closeTasks: Promise<unknown>[] = [];

  for (const [, q] of queuesByName) {
    closeTasks.push(q.close());
  }
  queuesByName.clear();

  if (simulationQueueInstance) {
    closeTasks.push(simulationQueueInstance.close());
    simulationQueueInstance = undefined;
  }

  if (redisClient) {
    closeTasks.push(
      redisClient.quit().catch(() => {
        redisClient?.disconnect();
      })
    );
    redisClient = undefined;
  }

  await Promise.all(closeTasks);
}