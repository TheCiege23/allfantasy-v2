/**
 * Draft room diagnostics — development-only warnings for integration debugging.
 * Avoids noisy production consoles; enable deeper tracing via NODE_ENV checks only.
 */
export function draftRoomWarn(scope: string, detail?: unknown): void {
  if (process.env.NODE_ENV === 'production') return
  if (detail !== undefined) {
    console.warn(`[draft-room:${scope}]`, detail)
  } else {
    console.warn(`[draft-room:${scope}]`)
  }
}

/**
 * Opt-in pick / gating trace for production debugging.
 * In the browser console: `localStorage.setItem('af:draft-room-debug','1')` then refresh.
 */
export function draftRoomPickTrace(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage?.getItem('af:draft-room-debug') !== '1') return
  } catch {
    return
  }
  console.info('[draft-room trace]', payload)
}
