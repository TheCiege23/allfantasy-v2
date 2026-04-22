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
