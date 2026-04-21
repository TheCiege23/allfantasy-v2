'use client'

const SESSION_KEY = 'af:analytics_session_v1'

export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function beaconUrl(): string {
  if (typeof window === 'undefined') return '/api/analytics/beacon'
  return `${window.location.origin}/api/analytics/beacon`
}

/**
 * Fire-and-forget product analytics (create-league funnel, engagement beacons).
 * Uses `sendBeacon` when available so events flush on unload.
 */
export function sendProductAnalyticsBeacon(event: string, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const sessionId = getAnalyticsSessionId()
  const payload = JSON.stringify({
    event,
    sessionId: sessionId || undefined,
    path: window.location?.pathname,
    meta: meta && typeof meta === 'object' ? sanitizeMeta(meta) : undefined,
  })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(beaconUrl(), new Blob([payload], { type: 'application/json' }))
      if (ok) return
    }
    void fetch('/api/analytics/beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {})
  } catch {
    // ignore
  }
}

function sanitizeMeta(meta: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 3) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (k.length > 64) continue
    if (typeof v === 'string') {
      out[k] = v.length > 500 ? `${v.slice(0, 500)}…` : v
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v
    } else if (typeof v === 'boolean') {
      out[k] = v
    } else if (v === null || v === undefined) {
      out[k] = v
    } else if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      out[k] = sanitizeMeta(v as Record<string, unknown>, depth + 1)
    }
  }
  return out
}
