# PROMPT 328 — Background Job System

## Objective

Move heavy tasks off the main request thread using a **queue system (BullMQ)** so that:

- **AI processing** can run in a worker
- **Notifications** (in-app, email, SMS, push) can be dispatched asynchronously
- **Draft simulations** can run in a worker

---

## Stack

- **BullMQ** — job queues with Redis backend
- **Redis** — required for queues (`REDIS_URL` or `REDIS_HOST` + `REDIS_PORT`)
- **Workers** — separate Node process(es) that run `scripts/start-worker.ts`

---

## Queues and Job Types

| Queue           | Purpose                         | Payload / processor |
|----------------|----------------------------------|---------------------|
| **ai**         | AI processing (trade, waiver, draft, digest) | `AiJobPayload` (type + payload); worker runs by type |
| **notifications** | Dispatch in-app + email/SMS/push   | `NotificationJobPayload` (same shape as `DispatchNotificationParams`); worker calls `dispatchNotification` |
| **simulations** | Draft/mock simulations            | `SimulationJobPayload`; worker processes (stub or full run) |

---

## Files

| Path | Purpose |
|------|--------|
| `lib/jobs/types.ts` | `QUEUE_NAMES`, `NotificationJobPayload`, `AiJobPayload`, `SimulationJobPayload` |
| `lib/jobs/enqueue.ts` | `enqueueNotification`, `enqueueAi`, `enqueueSimulation` |
| `lib/jobs/index.ts` | Re-exports |
| `lib/queues/bullmq.ts` | Redis connection, `getQueue(name)`, `getAiQueue()`, `getNotificationsQueue()`, `getSimulationQueue()` |
| `lib/workers/notification-worker.ts` | BullMQ worker for `notifications` queue; runs `dispatchNotification` |
| `lib/workers/ai-worker.ts` | BullMQ worker for `ai` queue; processes by `type` (placeholder for full AI logic) |
| `lib/workers/simulation-worker.ts` | BullMQ worker for `simulations` queue |
| `scripts/start-worker.ts` | Starts all three workers; SIGTERM/SIGINT shutdown |

---

## Enqueueing Jobs

### Notifications

Use when you want to dispatch notifications off the main request (e.g. after a draft event or commissioner broadcast):

```ts
import { enqueueNotification } from "@/lib/jobs"

const result = await enqueueNotification({
  userIds: ["user-id-1", "user-id-2"],
  category: "draft_alerts",
  type: "draft_on_the_clock",
  title: "You're on the clock",
  body: "Make your draft pick.",
  actionHref: "/app/league/LEAGUE_ID/draft",
  actionLabel: "Open draft",
})
if (result.ok) {
  // jobId can be used to poll status if needed
}
```

Existing call sites (e.g. `DraftNotificationService`, `commissioner/broadcast`, chat mentions) can be switched to `enqueueNotification` when Redis is configured so that the HTTP response returns immediately and the worker sends in-app/email/SMS/push.

### AI

```ts
import { enqueueAi } from "@/lib/jobs"

await enqueueAi({
  type: "trade_analysis",
  userId: "...",
  leagueId: "...",
  payload: { tradeId: "...", context: {} },
})
```

The AI worker currently acknowledges each job and logs; heavy AI logic can be moved from API routes into the worker (same services, invoked from the worker process).

### Simulations

Existing: `POST /api/lab/simulations/enqueue` with body `{ jobName?, payload }`.  
Or from server code:

```ts
import { enqueueSimulation } from "@/lib/jobs"

await enqueueSimulation({ leagueId: "...", rounds: 15 })
```

---

## Running Workers

1. **Redis** — Ensure Redis is running and `REDIS_URL` (or `REDIS_HOST` + `REDIS_PORT`) is set.
2. **Start workers** — From the project root:
   ```bash
   npm run worker:simulations
   ```
   This single script now starts **simulation**, **notification**, and **AI** workers. If Redis is not configured, workers log a warning and exit without processing.

3. **Production** — Run the worker process as a separate service (e.g. same host as API or dedicated worker host). Ensure it has access to the same Redis and env (e.g. Resend, Twilio for notifications).

---

## Job Status and Polling

- **Simulations:** `GET /api/lab/simulations/status?jobId=...` returns job state (e.g. completed, failed).
- For **notifications** and **AI**, job IDs are returned from enqueue helpers; you can add status endpoints that call `queue.getJob(jobId)` if needed.

---

## Graceful Degradation

- If Redis is not configured, `getNotificationsQueue()`, `getAiQueue()`, and `getSimulationQueue()` return `null`. Enqueue helpers return `{ ok: false, error: "..." }`.
- Callers can fall back to synchronous behavior (e.g. call `dispatchNotification` directly when `enqueueNotification` returns `ok: false`).

---

## Deliverable Summary

- **Queue system:** BullMQ with Redis; three queues: **ai**, **notifications**, **simulations**.
- **Retry / options:** BullMQ supports job retries and delays; see `removeOnComplete` / `removeOnFail` in `lib/jobs/enqueue.ts`.
- **Workers:** Notification worker runs `dispatchNotification`; AI worker has typed job handling (placeholder for full AI); simulation worker unchanged (can be wired to full mock-draft logic).
- **Enqueue API:** `enqueueNotification`, `enqueueAi`, `enqueueSimulation` from `lib/jobs`.
- **Start script:** `npm run worker:simulations` starts all workers; single process handles all three queues.

Heavy tasks (AI processing, notifications, draft simulations) can be moved off the main thread by enqueueing jobs and running the worker process.
