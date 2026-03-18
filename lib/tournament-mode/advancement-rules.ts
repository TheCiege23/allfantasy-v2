/**
 * PROMPT 3: Deterministic advancement rules and tiebreakers.
 * 60 → top 16 per conference, 120 → 32, 180 → 48, 240 → 64.
 * Tiebreakers: 1) W-L, 2) Points For. Bubble: optional Week 9 fill remaining slots.
 */

export const ADVANCEMENT_SLOTS_BY_POOL: Record<number, number> = {
  60: 16,
  120: 32,
  180: 48,
  240: 64,
}

/** Default advancement per conference for a given participant pool size. */
export function getAdvancementSlotsPerConference(participantPoolSize: number): number {
  return ADVANCEMENT_SLOTS_BY_POOL[participantPoolSize] ?? 16
}

/** Default tiebreaker order (deterministic). Commissioner override can be stored in Tournament.settings.qualificationTiebreakers. */
export const DEFAULT_TIEBREAKER_ORDER = ['wins', 'points_for'] as const

export type TiebreakerKey = 'wins' | 'points_for' | 'points_against' | 'head_to_head'

/** Compare two standing rows by configured tiebreakers. Returns negative if a before b, positive if b before a. */
export function compareByTiebreakers(
  a: { wins: number; losses: number; pointsFor: number; pointsAgainst: number },
  b: { wins: number; losses: number; pointsFor: number; pointsAgainst: number },
  order: string[] = [...DEFAULT_TIEBREAKER_ORDER]
): number {
  for (const key of order) {
    if (key === 'wins') {
      if (a.wins !== b.wins) return b.wins - a.wins
    } else if (key === 'points_for') {
      if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor
    } else if (key === 'points_against') {
      if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst
    }
  }
  return 0
}

/** Black/Gold default: elimination league size after qualification (e.g. 16-team leagues). */
export const ELIMINATION_LEAGUE_SIZE = 16

/** Number of elimination leagues per conference when condensing (e.g. 64 per conf → 4 leagues of 16). */
export function getEliminationLeagueCountPerConference(advancementPerConference: number): number {
  return Math.ceil(advancementPerConference / ELIMINATION_LEAGUE_SIZE)
}

/** Bubble: number of extra slots that can be filled by bubble week (configurable; 0 = disabled). */
export function getBubbleSlotsPerConference(advancementPerConference: number, bubbleEnabled: boolean): number {
  if (!bubbleEnabled) return 0
  return Math.max(0, Math.min(4, Math.floor(advancementPerConference / 16)))
}
