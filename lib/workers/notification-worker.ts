import "server-only";
import { Worker, Job, type ConnectionOptions } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "@/lib/queues/bullmq";
import { QUEUE_NAMES } from "@/lib/jobs/types";
import type { NotificationJobPayload } from "@/lib/jobs/types";
import type { NotificationCategoryId } from "@/lib/notification-settings/types";
import { dispatchNotification } from "@/lib/notifications/NotificationDispatcher";

export type NotificationJobResult = {
  ok: boolean;
  jobId: string | undefined;
  processedAt: string;
  dispatched: number;
  error?: string;
};

let notificationWorker: Worker<NotificationJobPayload, NotificationJobResult> | null = null;

function getConnection(): ConnectionOptions {
  const connection = getRedisConnection();
  if (!connection) {
    throw new Error(
      "Redis is not configured. Notification worker requires REDIS_URL or REDIS_HOST/REDIS_PORT."
    );
  }
  return connection;
}

async function processNotificationJob(
  job: Job<NotificationJobPayload, NotificationJobResult>
): Promise<NotificationJobResult> {
  const data = job.data;
  if (!data?.userIds?.length || !data?.category || !data?.type || !data?.title) {
    return {
      ok: false,
      jobId: job.id,
      processedAt: new Date().toISOString(),
      dispatched: 0,
      error: "Missing required fields: userIds, category, type, title",
    };
  }

  await dispatchNotification({
    userIds: data.userIds,
    category: data.category as NotificationCategoryId,
    productType: data.productType,
    type: data.type,
    title: data.title,
    body: data.body,
    actionHref: data.actionHref,
    actionLabel: data.actionLabel,
    meta: data.meta,
    severity: data.severity,
  });

  return {
    ok: true,
    jobId: job.id,
    processedAt: new Date().toISOString(),
    dispatched: data.userIds.length,
  };
}

export function startNotificationWorker(): Worker<
  NotificationJobPayload,
  NotificationJobResult
> | null {
  if (!isRedisConfigured()) {
    console.warn("[notification-worker] Redis not configured. Worker disabled.");
    return null;
  }

  if (notificationWorker) {
    return notificationWorker;
  }

  notificationWorker = new Worker<NotificationJobPayload, NotificationJobResult>(
    QUEUE_NAMES.NOTIFICATIONS,
    processNotificationJob,
    {
      connection: getConnection(),
      concurrency: 5,
    }
  );

  notificationWorker.on("completed", (job) => {
    console.log("[notification-worker] completed", job.id);
  });

  notificationWorker.on("failed", (job, err) => {
    console.error("[notification-worker] failed", job?.id, err?.message);
  });

  notificationWorker.on("error", (err) => {
    console.error("[notification-worker] error", err);
  });

  return notificationWorker;
}

export async function stopNotificationWorker(): Promise<void> {
  if (!notificationWorker) return;
  await notificationWorker.close();
  notificationWorker = null;
}

export function getNotificationWorker(): Worker<
  NotificationJobPayload,
  NotificationJobResult
> | null {
  return notificationWorker;
}
