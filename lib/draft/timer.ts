/** Server-side pick deadline: compare client clock skew to `timerEndAt` from draft state. */

export function secondsUntil(targetMs: number): number {
  return Math.max(0, Math.floor((targetMs - Date.now()) / 1000))
}
