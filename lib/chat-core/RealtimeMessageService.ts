/**
 * RealtimeMessageService — polling interval and refresh behavior for near-realtime chat.
 * Backend does not yet expose WebSocket/SSE; clients poll. This module defines intervals.
 */

export const DEFAULT_POLL_INTERVAL_MS = 8000
export const FAST_POLL_INTERVAL_MS = 4000

/** Interval for polling messages when room is visible. */
export function getPollIntervalMs(options?: { active?: boolean }): number {
  return options?.active ? FAST_POLL_INTERVAL_MS : DEFAULT_POLL_INTERVAL_MS
}
