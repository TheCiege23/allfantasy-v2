/**
 * Helpers to enqueue background jobs. Moves heavy work off the main request.
 */

import "server-only";
import { getNotificationsQueue, getAiQueue, getSimulationQueue } from "@/lib/queues/bullmq";
import type { NotificationJobPayload } from "./types";
import type { AiJobPayload } from "./types";
import type { SimulationJobPayload } from "./types";

const DEFAULT_JOB_OPTS = {
  removeOnComplete: 100,
  removeOnFail: 500,
};

export type EnqueueNotificationResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

/**
 * Enqueue a notification dispatch. Worker will call dispatchNotification(params).
 */
export async function enqueueNotification(
  payload: NotificationJobPayload,
  options?: { jobId?: string; delay?: number }
): Promise<EnqueueNotificationResult> {
  const queue = getNotificationsQueue();
  if (!queue) {
    return { ok: false, error: "Notifications queue not configured (Redis required)." };
  }
  try {
    const job = await queue.add(
      "dispatch",
      payload,
      {
        ...DEFAULT_JOB_OPTS,
        jobId: options?.jobId,
        delay: options?.delay,
      }
    );
    return { ok: true, jobId: job.id ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type EnqueueAiResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

/**
 * Enqueue an AI processing job. Worker processes by type (trade_analysis, waiver_analysis, etc.).
 */
export async function enqueueAi(
  payload: AiJobPayload,
  options?: { jobId?: string; delay?: number; priority?: number }
): Promise<EnqueueAiResult> {
  const queue = getAiQueue();
  if (!queue) {
    return { ok: false, error: "AI queue not configured (Redis required)." };
  }
  try {
    const job = await queue.add(
      payload.type,
      payload,
      {
        ...DEFAULT_JOB_OPTS,
        jobId: options?.jobId,
        delay: options?.delay,
        priority: options?.priority,
      }
    );
    return { ok: true, jobId: job.id ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type EnqueueSimulationResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

/**
 * Enqueue a draft/simulation job. Worker runs simulation off the main thread.
 */
export async function enqueueSimulation(
  payload: SimulationJobPayload,
  options?: { jobName?: string; delay?: number }
): Promise<EnqueueSimulationResult> {
  const queue = getSimulationQueue();
  if (!queue) {
    return { ok: false, error: "Simulation queue not configured (Redis required)." };
  }
  try {
    const job = await queue.add(
      options?.jobName ?? "simulation",
      payload,
      { ...DEFAULT_JOB_OPTS, delay: options?.delay }
    );
    return { ok: true, jobId: job.id ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
