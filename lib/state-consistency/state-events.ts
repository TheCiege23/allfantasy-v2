/**
 * Global client event bus for state consistency across app domains.
 */
export const GLOBAL_STATE_REFRESH_EVENT = 'af:state-refresh'

export type StateRefreshDomain =
  | 'auth'
  | 'leagues'
  | 'drafts'
  | 'chat'
  | 'ai'
  | 'tokens'
  | 'subscriptions'
  | 'all'

export type StateRefreshEventDetail = {
  domain: StateRefreshDomain
  reason?: string
  leagueId?: string | null
  source?: string
  timestamp: number
}

export function dispatchStateRefreshEvent(
  detail: Omit<StateRefreshEventDetail, 'timestamp'>
): void {
  if (typeof window === 'undefined') return
  const payload: StateRefreshEventDetail = {
    ...detail,
    timestamp: Date.now(),
  }
  window.dispatchEvent(new CustomEvent<StateRefreshEventDetail>(GLOBAL_STATE_REFRESH_EVENT, { detail: payload }))
}

export function addStateRefreshListener(
  domains: StateRefreshDomain | StateRefreshDomain[],
  listener: (detail: StateRefreshEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const domainSet = new Set(Array.isArray(domains) ? domains : [domains])
  const onRefresh = (event: Event) => {
    const custom = event as CustomEvent<StateRefreshEventDetail>
    const detail = custom?.detail
    if (!detail) return
    if (detail.domain === 'all' || domainSet.has(detail.domain)) {
      listener(detail)
    }
  }
  window.addEventListener(GLOBAL_STATE_REFRESH_EVENT, onRefresh as EventListener)
  return () => window.removeEventListener(GLOBAL_STATE_REFRESH_EVENT, onRefresh as EventListener)
}

