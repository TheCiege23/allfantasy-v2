import "server-only";
import { Queue, type ConnectionOptions } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
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

/**
 * ioredis treats a bare "/" or other path-like strings as a Unix socket path.
 * On Vercel that yields `connect EROFS /` (read-only FS). Reject invalid URLs.
 */
function isPlausibleRedisUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/") && !v.startsWith("//")) return false;
  if (!/^rediss?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    return Boolean(u.hostname?.length);
  } catch {
    return false;
  }
}

function isPlausibleRedisHost(host: string): boolean {
  const h = host.trim();
  if (!h || h === "/" || h === ".") return false;
  return true;
}

function getRedisUrl(): string | null {
  const value = process.env.REDIS_URL?.trim();
  if (!value) return null;
  if (!isPlausibleRedisUrl(value)) {
    console.warn(
      "[bullmq] REDIS_URL is set but not a valid redis(s):// URL with hostname; Redis disabled. " +
        "Remove it or set a TCP URL (e.g. Upstash rediss://…).",
    );
    return null;
  }
  return value;
}

function getRedisHost(): string | null {
  const value = process.env.REDIS_HOST?.trim();
  if (!value || !isPlausibleRedisHost(value)) return null;
  return value;
}

function getRedisPort(): number | null {
  return parseRedisPort(process.env.REDIS_PORT);
}

function getRedisOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 8_000,
    retryStrategy: (times: number) => (times > 2 ? null : Math.min(times * 200, 2_000)),
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
    redisClient.on("error", (err) => {
      console.warn("[redis]", err instanceof Error ? err.message : err);
    });
    return redisClient;
  }

  if (host && port) {
    redisClient = new IORedis(port, host, options);
    redisClient.on("error", (err) => {
      console.warn("[redis]", err instanceof Error ? err.message : err);
    });
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

export function getAutoCoachStatusQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.AUTOCOACH_STATUS);
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