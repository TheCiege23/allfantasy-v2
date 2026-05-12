import { logStructured } from '@/lib/logging/structured'

// ── Lightweight delivery counters (reset per cold start) ─────────────────────
// Exposed via getPusherPublishStats() for health-check visibility without
// requiring an external metrics store.
const publishCounters = { attempts: 0, deliveries: 0, errors: 0 }
export function getStreamPublishStats() {
  return { ...publishCounters }
}

type DraftStreamEventName =
  | 'connected'
  | 'draft_state'
  | 'pick_made'
  | 'timer_update'
  | 'draft_paused'
  | 'draft_resumed'
  | 'auction_bid'
  | 'auction_closed'
  | 'ai_recommendation'
  | 'chat_message'
  | 'draft_complete'

export type DraftStreamEvent = {
  type: DraftStreamEventName
  payload: unknown
  at: string
}

type DraftSubscriber = (event: DraftStreamEvent) => void

class DraftStreamStore {
  private subscribers = new Map<string, Set<DraftSubscriber>>()
  private latestState = new Map<string, unknown>()

  subscribe(draftId: string, subscriber: DraftSubscriber) {
    const set = this.subscribers.get(draftId) ?? new Set<DraftSubscriber>()
    set.add(subscriber)
    this.subscribers.set(draftId, set)

    return () => {
      const current = this.subscribers.get(draftId)
      if (!current) return
      current.delete(subscriber)
      if (current.size === 0) {
        this.subscribers.delete(draftId)
      }
    }
  }

  publish(draftId: string, type: DraftStreamEventName, payload: unknown) {
    if (type === 'draft_state') {
      this.latestState.set(draftId, payload)
    }

    const event: DraftStreamEvent = {
      type,
      payload,
      at: new Date().toISOString(),
    }

    const set = this.subscribers.get(draftId)
    if (!set?.size) return

    publishCounters.attempts++
    let delivered = 0
    let errorCount = 0

    for (const subscriber of set) {
      try {
        subscriber(event)
        delivered++
      } catch (err) {
        errorCount++
        publishCounters.errors++
        logStructured('error', 'draft_stream_store', 'subscriber_dispatch_error', {
          draftId,
          eventType: type,
          error: err instanceof Error ? err.message : String(err),
          failureRate: publishCounters.attempts > 0
            ? (publishCounters.errors / publishCounters.attempts).toFixed(3)
            : '0',
        })
      }
    }
    publishCounters.deliveries += delivered

    if (errorCount > 0) {
      logStructured('warn', 'draft_stream_store', 'partial_delivery', {
        draftId,
        eventType: type,
        delivered,
        errors: errorCount,
        total: set.size,
      })
    }
  }

  getLatestState(draftId: string) {
    return this.latestState.get(draftId) ?? null
  }
}

const draftStreamGlobal = globalThis as typeof globalThis & {
  __afDraftStreamStore?: DraftStreamStore
}

export const draftStreamStore =
  draftStreamGlobal.__afDraftStreamStore ??
  (draftStreamGlobal.__afDraftStreamStore = new DraftStreamStore())
