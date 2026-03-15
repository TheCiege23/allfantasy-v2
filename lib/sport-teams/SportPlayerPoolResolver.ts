/**
 * Resolves player pool by sport so leagues only load players for their sport.
 * Uses SportsPlayer and PlayerIdentityMap; draft room and waiver wire filter by league sport.
 *
 * Soccer: sport_type = SOCCER only. Positions: GKP/GK, DEF, MID, FWD (use options.position to filter). Soccer leagues load only soccer teams and players.
 * NFL IDP: same pool as NFL (sport_type = NFL). Include defensive players (DE, DT, LB, CB, S) in ingestion so they appear; use options.position (e.g. DE, DT, LB, CB, S) for position filter. Eligibility by slot uses PositionEligibilityResolver with formatType IDP.
 */
import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SportType, PoolPlayerRecord } from './types'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'

const SPORT_STR: Record<LeagueSport, string> = {
  NFL: 'NFL',
  NBA: 'NBA',
  MLB: 'MLB',
  NHL: 'NHL',
  NCAAF: 'NCAAF',
  NCAAB: 'NCAAB',
  SOCCER: 'SOCCER',
}

/**
 * Get player pool for a sport from SportsPlayer table (sport-scoped).
 */
export async function getPlayerPoolForSport(
  sportType: SportType | LeagueSport | string,
  options?: { limit?: number; teamId?: string; position?: string }
): Promise<PoolPlayerRecord[]> {
  const sport = normalizeSport(sportType)
  const where: { sport: string; team?: string; position?: string } = { sport }
  if (options?.teamId?.trim()) where.team = options.teamId.trim()
  if (options?.position?.trim()) where.position = options.position.trim()

  const rows = await prisma.sportsPlayer.findMany({
    where,
    take: options?.limit ?? 2000,
    orderBy: { name: 'asc' },
  })

  return rows.map((r) => ({
    player_id: r.id,
    sport_type: sport as SportType,
    team_id: r.teamId ?? null,
    team_abbreviation: r.team ?? null,
    full_name: r.name,
    position: r.position ?? '',
    status: r.status ?? null,
    injury_status: deriveInjuryStatus(r.status),
    external_source_id: r.sleeperId ?? r.externalId ?? null,
    age: r.age ?? null,
    experience: null,
    secondary_positions: [],
    metadata: {},
  }))
}

/**
 * Get player pool for a league (sport = league.sport). Use for draft room and waiver pool.
 * For NFL IDP leagues, pass same leagueSport (NFL); pool includes all NFL players when no position filter; use options.position to filter by DE, DT, LB, CB, S when needed.
 */
export async function getPlayerPoolForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  options?: { limit?: number; teamId?: string; position?: string }
): Promise<PoolPlayerRecord[]> {
  const sportType = leagueSportToSportType(leagueSport)
  const sportStr = SPORT_STR[leagueSport] ?? sportType
  return getPlayerPoolForSport(sportStr, options)
}

/**
 * Check if a player belongs to a given sport (by SportsPlayer or PlayerIdentityMap).
 */
export async function isPlayerInSportPool(
  playerIdOrExternalId: string,
  sportType: SportType | LeagueSport | string
): Promise<boolean> {
  const sport = normalizeSport(sportType)
  const bySports = await prisma.sportsPlayer.findFirst({
    where: {
      sport,
      OR: [{ id: playerIdOrExternalId }, { externalId: playerIdOrExternalId }, { sleeperId: playerIdOrExternalId }],
    },
  })
  if (bySports) return true
  const byIdentity = await prisma.playerIdentityMap.findFirst({
    where: {
      sport,
      OR: [
        { sleeperId: playerIdOrExternalId },
        { fantasyCalcId: playerIdOrExternalId },
        { apiSportsId: playerIdOrExternalId },
      ],
    },
  })
  return !!byIdentity
}

/** Injury-like status values; when status matches, use it as injury_status. */
const INJURY_STATUS_PATTERNS = ['OUT', 'IR', 'DOUBTFUL', 'QUESTIONABLE', 'PUP', 'SUSPENDED', 'DNR', 'DNP', 'INJURED']

function deriveInjuryStatus(status: string | null): string | null {
  if (status == null || !status.trim()) return null
  const upper = status.toUpperCase().trim()
  if (INJURY_STATUS_PATTERNS.some((p) => upper === p || upper.startsWith(p + ' ') || upper.includes(' ' + p))) return status
  return null
}

function normalizeSport(s: SportType | LeagueSport | string): string {
  if (typeof s !== 'string') return (s as string).toString()
  return s.toUpperCase()
}
