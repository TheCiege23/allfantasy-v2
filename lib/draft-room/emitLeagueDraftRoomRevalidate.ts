/** Custom event name: commissioner (or tooling) refreshed league roster/draft inputs; draft room refetches session + pool. */
export const LEAGUE_DRAFT_ROOM_REVALIDATE = 'allfantasy:league-draft-room-revalidate'

export function emitLeagueDraftRoomRevalidate(leagueId: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(LEAGUE_DRAFT_ROOM_REVALIDATE, { detail: { leagueId } }),
  )
}
