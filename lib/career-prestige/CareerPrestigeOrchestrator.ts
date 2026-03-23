/**
 * CareerPrestigeOrchestrator — run all career systems for a league or manager (GM Economy, XP, Reputation, Legacy, Awards, Record Books).
 * Does not run Hall of Fame induction (handled separately in Hall of Fame tab).
 */

import { runGMEconomyForManager } from '@/lib/gm-economy/GMEconomyEngine'
import { runForManager } from '@/lib/xp-progression/XPProgressionEngine'
import { runReputationEngineForLeague } from '@/lib/reputation-engine/ReputationEngine'
import { runLegacyScoreEngineForLeague } from '@/lib/legacy-score-engine/LegacyScoreEngine'
import { runAwardsEngine } from '@/lib/awards-engine/AwardsEngine'
import { runRecordBookEngine } from '@/lib/record-book-engine/RecordBookEngine'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { resolveSportForCareer } from '@/lib/career-prestige/SportPrestigeResolver'

export interface OrchestratorResult {
  leagueId?: string
  managerId?: string
  gmEconomy: { processed: number }
  xp: { processed: number }
  reputation: { processed: number }
  legacy: { processed: number }
  awards: { seasonsProcessed: string[]; awardsCreated: number }
  recordBook: { seasonsProcessed: string[]; entriesCreated: number; entriesUpdated: number }
}

/**
 * Run all career engines for a league. Uses league's rosters for manager list; runs awards and record book for recent seasons.
 */
export async function runAllForLeague(
  leagueId: string,
  options?: { sport?: string | null; seasons?: string[] }
): Promise<OrchestratorResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport = resolveSportForCareer(options?.sport ?? league?.sport ?? DEFAULT_SPORT)
  const currentYear = new Date().getFullYear()
  const seasonsRaw = options?.seasons ?? [String(currentYear), String(currentYear - 1)]
  const seasons = Array.from(
    new Set(seasonsRaw.map((season) => season?.trim()).filter((season): season is string => Boolean(season)))
  )

  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { platformUserId: true },
  })
  const managerIds = [...new Set(rosters.map((r) => r.platformUserId).filter(Boolean))]

  let gmProcessed = 0
  for (const managerId of managerIds.slice(0, 100)) {
    const r = await runGMEconomyForManager(managerId)
    if (r) gmProcessed += 1
  }

  let xpProcessed = 0
  for (const managerId of managerIds.slice(0, 100)) {
    await runForManager(managerId, { sport })
    xpProcessed += 1
  }

  const repResult = await runReputationEngineForLeague(leagueId, { sport })
  const legacyResult = await runLegacyScoreEngineForLeague(leagueId, { sport: sport ?? DEFAULT_SPORT })
  let awardsCreated = 0
  const seasonsProcessedAwards: string[] = []
  for (const season of seasons) {
    const a = await runAwardsEngine(leagueId, season, { sport })
    awardsCreated += a.awardsCreated
    seasonsProcessedAwards.push(season)
  }
  const rbResult = await runRecordBookEngine(leagueId, seasons, { sport })

  return {
    leagueId,
    gmEconomy: { processed: gmProcessed },
    xp: { processed: xpProcessed },
    reputation: { processed: repResult?.processed ?? 0 },
    legacy: { processed: legacyResult?.processed ?? 0 },
    awards: { seasonsProcessed: seasonsProcessedAwards, awardsCreated },
    recordBook: {
      seasonsProcessed: rbResult.seasonsProcessed,
      entriesCreated: rbResult.entriesCreated,
      entriesUpdated: rbResult.entriesUpdated,
    },
  }
}

/**
 * Run GM Economy and XP for a single manager (cross-league).
 */
export async function runAllForManager(
  managerId: string,
  options?: { sport?: string | null }
): Promise<OrchestratorResult> {
  const sport = options?.sport ?? undefined

  const gmResult = await runGMEconomyForManager(managerId)
  await runForManager(managerId, { sport })

  return {
    managerId,
    gmEconomy: { processed: gmResult ? 1 : 0 },
    xp: { processed: 1 },
    reputation: { processed: 0 },
    legacy: { processed: 0 },
    awards: { seasonsProcessed: [], awardsCreated: 0 },
    recordBook: { seasonsProcessed: [], entriesCreated: 0, entriesUpdated: 0 },
  }
}
