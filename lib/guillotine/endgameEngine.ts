import { prisma } from '@/lib/prisma'

export type GuillotineEndgameFormat =
  | 'last_team_standing'
  | 'final_four'
  | 'final_three'
  | 'final_two'

/** Remaining-roster threshold at which the final stage opens. */
const ENDGAME_THRESHOLD: Record<GuillotineEndgameFormat, number> = {
  last_team_standing: 1,
  final_two: 2,
  final_three: 3,
  final_four: 4,
}

async function readEndgameFormat(leagueId: string): Promise<GuillotineEndgameFormat> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const raw = (league?.settings as Record<string, unknown> | null)?.guillotineEndgame
  if (
    raw === 'final_four' ||
    raw === 'final_three' ||
    raw === 'final_two' ||
    raw === 'last_team_standing'
  ) {
    return raw
  }
  return 'last_team_standing'
}

export async function transitionToFinalStage(seasonId: string, scoringPeriod: number): Promise<void> {
  await prisma.guillotineSeason.update({
    where: { id: seasonId },
    data: {
      isInFinalStage: true,
      finalStageStartPeriod: scoringPeriod,
      status: 'final_stage',
    },
  })
}

export interface EndgameState {
  format: GuillotineEndgameFormat
  threshold: number
  aliveRosterIds: string[]
  inFinalStage: boolean
  /** Non-null only when the season is fully resolved and a single winner exists. */
  champion: string | null
}

/**
 * Compute current endgame state for a guillotine season. When alive count
 * drops to the configured threshold, caller should invoke transitionToFinalStage.
 */
export async function determineEndgameState(seasonId: string): Promise<EndgameState | null> {
  const g = await prisma.guillotineSeason.findFirst({
    where: { id: seasonId },
    include: {
      redraftSeason: {
        include: { rosters: { where: { isEliminated: false }, select: { id: true, leagueId: true } } },
      },
    },
  })
  if (!g?.redraftSeason) return null
  const alive = g.redraftSeason.rosters
  const leagueId = alive[0]?.leagueId ?? g.redraftSeason.id
  const format = await readEndgameFormat(leagueId)
  const threshold = ENDGAME_THRESHOLD[format]
  const aliveIds = alive.map((r) => r.id)
  return {
    format,
    threshold,
    aliveRosterIds: aliveIds,
    inFinalStage: aliveIds.length <= threshold,
    champion: aliveIds.length === 1 ? aliveIds[0]! : null,
  }
}

export async function determineFinalChampion(seasonId: string): Promise<string | null> {
  const state = await determineEndgameState(seasonId)
  return state?.champion ?? null
}
