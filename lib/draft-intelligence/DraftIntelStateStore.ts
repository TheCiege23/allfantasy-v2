import type { DraftIntelState, DraftIntelStreamEnvelope } from './types'

type Listener = (event: DraftIntelStreamEnvelope) => void

function getKey(leagueId: string, userId: string) {
  return `${leagueId}:${userId}`
}

class DraftIntelStateStore {
  private readonly state = new Map<string, DraftIntelState>()
  private readonly listeners = new Map<string, Set<Listener>>()

  get(leagueId: string, userId: string): DraftIntelState | null {
    return this.state.get(getKey(leagueId, userId)) ?? null
  }

  set(
    eventType: DraftIntelStreamEnvelope['type'],
    nextState: DraftIntelState
  ): DraftIntelState {
    const key = getKey(nextState.leagueId, nextState.userId)
    this.state.set(key, nextState)
    const envelope: DraftIntelStreamEnvelope = {
      type: eventType,
      leagueId: nextState.leagueId,
      userId: nextState.userId,
      state: nextState,
    }
    const listeners = this.listeners.get(key)
    if (listeners?.size) {
      for (const listener of listeners) {
        try {
          listener(envelope)
        } catch {
          // Ignore subscriber failures to keep stream fanout resilient.
        }
      }
    }
    return nextState
  }

  subscribe(leagueId: string, userId: string, listener: Listener): () => void {
    const key = getKey(leagueId, userId)
    const current = this.listeners.get(key) ?? new Set<Listener>()
    current.add(listener)
    this.listeners.set(key, current)
    return () => {
      const listeners = this.listeners.get(key)
      if (!listeners) return
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(key)
      }
    }
  }
}

export const draftIntelStateStore = new DraftIntelStateStore()
