/**
 * Sport-specific qualification → next-round advancement targets for tournament hubs.
 * Pool sizes are fixed tiers: 72, 144, 216 managers (6 / 12 / 18 leagues × 12 teams).
 *
 * NFL example: 60 of 72 managers advance after qualification round 1 (product rule).
 * Other sports use the same 5/6 retention ratio unless overridden below.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'

/** Allowed tournament participant pool sizes exposed by create flows. */
export const TOURNAMENT_POOL_TIERS = [32, 64, 72, 96, 128, 144, 160, 192, 216, 224] as const

/** Feeder league counts for each tier (12-team feeders; final league may be partial). */
export const FEEDER_LEAGUES_BY_POOL: Record<(typeof TOURNAMENT_POOL_TIERS)[number], number> = {
  32: 2,
  64: 5,
  72: 6,
  96: 8,
  128: 10,
  144: 12,
  160: 13,
  192: 16,
  216: 18,
  224: 18,
}

/** Fixed teams per feeder league for tournament qualification. */
export const TOURNAMENT_TEAMS_PER_LEAGUE = 12

/**
 * How many managers advance out of qualification into the next tournament phase (sport-aware).
 * Stored on `LegacyTournament.settings.qualificationAdvancementTotal` at create time.
 */
export function getQualificationAdvancementTotal(sport: string, participantPoolSize: number): number {
  const s = (normalizeToSupportedSport(sport) ?? 'NFL') as LeagueSport
  const pool = participantPoolSize

  // Explicit NFL targets for the standard 72-manager tier (60 advance).
  if (pool === 72 && s === 'NFL') {
    return 60
  }

  // Same ratio as NFL 72-tier for other sports at 72: 60 advance.
  if (pool === 72) {
    return 60
  }

  // Scale proportionally for 144 and 216 (5/6 of pool advance).
  if (pool === 144 || pool === 216) {
    return Math.floor((pool * 5) / 6)
  }

  // Fallback: nearest 5/6 rule for any legacy pool size.
  return Math.max(12, Math.floor((pool * 5) / 6))
}

export function getFeederLeagueCountForPool(participantPoolSize: number): number {
  const n = FEEDER_LEAGUES_BY_POOL[participantPoolSize as keyof typeof FEEDER_LEAGUES_BY_POOL]
  if (typeof n === 'number') return n
  return Math.max(2, Math.floor(participantPoolSize / TOURNAMENT_TEAMS_PER_LEAGUE))
}

/**
 * Managers that advance from qualification per conference (e.g. 60 total / 2 conferences = 30 each).
 */
export function getQualificationCutSlotsPerConference(
  sport: string,
  participantPoolSize: number,
  qualificationAdvancementTotal: number | undefined,
  conferenceCount: number
): number {
  const total = qualificationAdvancementTotal ?? getQualificationAdvancementTotal(sport, participantPoolSize)
  return Math.max(1, Math.floor(total / Math.max(1, conferenceCount)))
}

/**
 * Sport-aware "regular-season weekly buckets" used for tournament round windowing.
 * These are *fantasy weeks* (the unit standings/matchups are aggregated by) — they
 * intentionally compress long daily-fixture sports (NBA, NHL, MLB) into a smaller
 * weekly grid so a tournament can still resolve in a reasonable number of rounds.
 */
const SPORT_SEASON_WEEKS: Record<string, number> = {
  NFL: 18,
  NCAAF: 15,
  NBA: 24,
  NHL: 26,
  MLB: 27,
  NCAAB: 19,
  SOCCER: 38,
}

/**
 * Default fantasy-week the qualification round closes / playoffs open. NFL's product
 * convention has been week 10 (the historical playoff-start week); other sports are
 * scaled to the analogous point in their season.
 */
const SPORT_PLAYOFF_START_WEEK: Record<string, number> = {
  NFL: 10,
  NCAAF: 9,
  NBA: 16,
  NHL: 18,
  MLB: 18,
  NCAAB: 13,
  SOCCER: 26,
}

/** Default round window length (weeks per elimination round) for each sport. */
const SPORT_ROUND_LENGTH_WEEKS: Record<string, number> = {
  NFL: 3,
  NCAAF: 2,
  NBA: 2,
  NHL: 2,
  MLB: 2,
  NCAAB: 2,
  SOCCER: 3,
}

function normalizeSportKey(sport: string | null | undefined): string {
  const s = (normalizeToSupportedSport(sport ?? 'NFL') ?? 'NFL') as LeagueSport
  return s
}

/** Total fantasy weeks in the regular season for the given sport (clamped to ≥ 4). */
export function getSeasonWeekCount(sport: string | null | undefined): number {
  const s = normalizeSportKey(sport)
  return Math.max(4, SPORT_SEASON_WEEKS[s] ?? SPORT_SEASON_WEEKS.NFL!)
}

/** Fantasy week the qualification round ends and playoffs/elimination open. */
export function getPlayoffStartWeek(sport: string | null | undefined): number {
  const s = normalizeSportKey(sport)
  const total = getSeasonWeekCount(s)
  const start = SPORT_PLAYOFF_START_WEEK[s] ?? SPORT_PLAYOFF_START_WEEK.NFL!
  return Math.max(2, Math.min(total - 2, start))
}

/** Default length (in fantasy weeks) of a single elimination round. */
export function getRoundLengthWeeks(sport: string | null | undefined): number {
  const s = normalizeSportKey(sport)
  return Math.max(1, SPORT_ROUND_LENGTH_WEEKS[s] ?? SPORT_ROUND_LENGTH_WEEKS.NFL!)
}

/**
 * Compute the [startWeek, endWeek] window for an elimination round at index N
 * (0 = qualification, 1 = first elimination, etc.). The championship round always
 * runs through the season's final week regardless of `roundLength`.
 */
export function getRoundWindow(
  sport: string | null | undefined,
  roundIndex: number,
  isChampionship = false,
): { startWeek: number; endWeek: number } {
  const total = getSeasonWeekCount(sport)
  const playoffStart = getPlayoffStartWeek(sport)
  const len = getRoundLengthWeeks(sport)

  if (roundIndex <= 0) {
    return { startWeek: 1, endWeek: Math.max(2, playoffStart - 1) }
  }
  const startWeek = playoffStart + (roundIndex - 1) * len
  const endWeek = isChampionship ? total : Math.min(total, startWeek + len - 1)
  return {
    startWeek: Math.min(startWeek, total - 1),
    endWeek: Math.max(startWeek, endWeek),
  }
}
