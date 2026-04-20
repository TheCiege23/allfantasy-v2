/**
 * Canonical draft engine facade — core logic lives in `lib/live-draft-engine/*`.
 * Use these URLs and helpers for new integrations (mobile, Chimmy, specialty formats).
 */

export { generateFullPickOrder } from './order/generateFullPickOrder'
export type { PlannedPickSlot } from './order/generateFullPickOrder'

export * from './validation/draftInvariants'
export * from './queue/autopickPreference'

/** REST endpoints (App Router). */
export const draftApi = {
  session: (leagueId: string) => `/api/leagues/${encodeURIComponent(leagueId)}/draft/session`,
  /** Alias of `draft/controls` — pause, resume, undo, complete, etc. */
  actions: (leagueId: string) => `/api/leagues/${encodeURIComponent(leagueId)}/draft/actions`,
  controls: (leagueId: string) => `/api/leagues/${encodeURIComponent(leagueId)}/draft/controls`,
  pickByDraftId: (draftId: string) => `/api/draft/${encodeURIComponent(draftId)}/pick`,
  stream: (draftId: string) => `/api/draft/stream/${encodeURIComponent(draftId)}`,
  roomState: () => `/api/draft/room/state`,
} as const
