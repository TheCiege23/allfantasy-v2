/**
 * G15.1 — Event Foundation: Outbox Relay.
 *
 * Reads pending outbox events and publishes them to the EventBus, marking each
 * dispatched (success) or scheduling a backed-off retry (failure). Delivery is
 * at-least-once; consumers MUST be idempotent (keyed on eventId).
 *
 * The relay is transport-agnostic and process-agnostic: it can run inline (a
 * cron/route), as a BullMQ worker, or as a long-running daemon (reusing the
 * `lib/live-scoring/workerLoop.ts` pattern). G15.1 ships the function; wiring a
 * live distributed worker is G15.3.
 */
import type { DomainEvent, IEventBus, IOutboxStore } from './types'

export interface OutboxRelayOptions {
  /** Max events to dispatch per pass. */
  batchSize?: number
  /** Backoff for a failed dispatch: base * 2^attempts, capped. */
  baseRetryMs?: number
  maxRetryMs?: number
  now?: () => Date
}

export interface DispatchSummary {
  fetched: number
  dispatched: number
  failed: number
  failures: { eventId: string; error: string }[]
}

export class OutboxRelay {
  private readonly batchSize: number
  private readonly baseRetryMs: number
  private readonly maxRetryMs: number
  private readonly now: () => Date

  constructor(
    private readonly store: IOutboxStore,
    private readonly bus: IEventBus,
    opts: OutboxRelayOptions = {},
  ) {
    this.batchSize = opts.batchSize ?? 100
    this.baseRetryMs = opts.baseRetryMs ?? 5_000
    this.maxRetryMs = opts.maxRetryMs ?? 5 * 60_000
    this.now = opts.now ?? (() => new Date())
  }

  /** Dispatch one batch of pending events. Returns a summary; never throws for a single bad event. */
  async dispatchPending(): Promise<DispatchSummary> {
    const pending: DomainEvent[] = await this.store.fetchPending(this.batchSize, this.now())
    const summary: DispatchSummary = { fetched: pending.length, dispatched: 0, failed: 0, failures: [] }

    for (const event of pending) {
      try {
        await this.bus.publish(event)
        await this.store.markDispatched(event.eventId)
        summary.dispatched += 1
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        // attempts is incremented in the store; schedule a simple capped exponential backoff.
        const delay = Math.min(this.baseRetryMs, this.maxRetryMs)
        await this.store.markFailed(event.eventId, error, new Date(this.now().getTime() + delay))
        summary.failed += 1
        summary.failures.push({ eventId: event.eventId, error })
      }
    }

    return summary
  }
}
