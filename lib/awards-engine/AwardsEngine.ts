/**
 * AwardsEngine — run analysis and persist award records for a league/season.
 */

import { prisma } from '@/lib/prisma'
import { analyzeSeasonPerformance } from './SeasonPerformanceAnalyzer'
import { calculateAwardWinners } from './AwardScoreCalculator'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export interface AwardsEngineResult {
  leagueId: string
  season: string
  sport: string
  awardsCreated: number
  awardTypes: string[]
}

/**
 * Generate awards for a league+season: analyze performance, calculate winners, replace existing records.
 */
export async function runAwardsEngine(
  leagueId: string,
  season: string,
  options?: { sport?: string | null }
): Promise<AwardsEngineResult> {
  const sport = options?.sport ?? DEFAULT_SPORT

  const input = await analyzeSeasonPerformance(leagueId, season, { sport })
  const winners = calculateAwardWinners(input)

  await prisma.awardRecord.deleteMany({
    where: { leagueId, season },
  })

  const awardTypes: string[] = []
  for (const w of winners) {
    await prisma.awardRecord.create({
      data: {
        leagueId,
        sport: input.sport,
        season,
        awardType: w.awardType,
        managerId: w.managerId,
        score: w.score,
      },
    })
    awardTypes.push(w.awardType)
  }

  return {
    leagueId,
    season,
    sport: input.sport,
    awardsCreated: winners.length,
    awardTypes,
  }
}

/**
 * Run for multiple seasons (e.g. last 3 years).
 */
export async function runAwardsEngineForLeague(
  leagueId: string,
  seasons: string[],
  options?: { sport?: string | null }
): Promise<AwardsEngineResult[]> {
  const results: AwardsEngineResult[] = []
  for (const season of seasons) {
    const r = await runAwardsEngine(leagueId, season, options)
    results.push(r)
  }
  return results
}
