import { prisma } from '@/lib/prisma'
import { processWaiverClaimsForLeague } from '@/lib/waiver-wire/process-engine'
import { auditDynastyCutdowns, expireOverdueKeeperDeclarations } from '@/lib/league/keeper-engine'
import { scoreLeagueWeek } from '@/lib/scoring/scoring-engine'
import {
  generateDraftRecapArtifact,
  generateWeeklyLeagueArtifacts,
} from '@/lib/league/format-artifact-service'

export function resolveSeasonWeek(input?: {
  season?: number | null
  weekOrRound?: number | null
}): { season: number; weekOrRound: number } {
  const now = new Date()
  return {
    season: input?.season ?? now.getUTCFullYear(),
    weekOrRound: input?.weekOrRound ?? 1,
  }
}

export async function runScoringWorker(options?: {
  leagueIds?: string[]
  season?: number | null
  weekOrRound?: number | null
  lockScores?: boolean
}) {
  const period = resolveSeasonWeek(options)
  const leagues = await prisma.league.findMany({
    where: options?.leagueIds?.length ? { id: { in: options.leagueIds } } : undefined,
    select: { id: true },
  })

  const results = []
  for (const league of leagues) {
    results.push(
      await scoreLeagueWeek({
        leagueId: league.id,
        season: period.season,
        weekOrRound: period.weekOrRound,
        lockScores: options?.lockScores,
      })
    )
  }

  return {
    ...period,
    processedLeagues: results.length,
    results,
  }
}

export async function runWeeklyLeagueAutomation(options?: {
  season?: number | null
  weekOrRound?: number | null
}) {
  const scoring = await runScoringWorker({
    season: options?.season,
    weekOrRound: options?.weekOrRound,
  })
  await Promise.all(
    scoring.results.map(async (result) => {
      await generateWeeklyLeagueArtifacts({
        leagueId: result.leagueId,
        season: result.season,
        week: result.weekOrRound,
      }).catch(() => null)
      await generateDraftRecapArtifact(result.leagueId).catch(() => null)
    })
  )
  const keepersExpired = await expireOverdueKeeperDeclarations()
  const cutdownAudit = await auditDynastyCutdowns()

  return {
    ...scoring,
    keepersExpired,
    cutdownAuditCount: cutdownAudit.length,
  }
}

export async function runWaiverProcessingWorker(options?: { leagueIds?: string[] }) {
  const pending = await prisma.waiverClaim.findMany({
    where: {
      status: 'pending',
      ...(options?.leagueIds?.length ? { leagueId: { in: options.leagueIds } } : {}),
    },
    select: {
      leagueId: true,
    },
  })

  const leagueIds = Array.from(new Set(pending.map((claim) => claim.leagueId)))
  const results = []
  for (const leagueId of leagueIds) {
    results.push({
      leagueId,
      claims: await processWaiverClaimsForLeague(leagueId),
    })
  }

  return {
    processedLeagues: leagueIds.length,
    results,
  }
}
