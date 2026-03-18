/**
 * PROMPT 3: C2C standings — unified, separate (college + pro), hybrid championship. Fully deterministic.
 * AI does not decide titles; formula only.
 */

import { prisma } from '@/lib/prisma'
import { getC2CConfig } from '../C2CLeagueConfig'

export interface C2CStandingsRow {
  rosterId: string
  platformUserId: string
  rank: number
  proPoints: number
  collegePoints: number
  /** Unified: combined display; separate: N/A for single bucket; hybrid: weighted total. */
  combinedPoints: number
  wins?: number
  losses?: number
  ties?: number
}

export interface C2CUnifiedStandingsResult {
  model: 'unified'
  rows: C2CStandingsRow[]
}

export interface C2CSeparateStandingsResult {
  model: 'separate'
  pro: C2CStandingsRow[]
  college: C2CStandingsRow[]
}

export interface C2CHybridStandingsResult {
  model: 'hybrid'
  rows: C2CStandingsRow[]
  proWeight: number
  collegeWeight: number
  playoffQualification: string
  championshipTieBreaker: string
}

export type C2CStandingsResult = C2CUnifiedStandingsResult | C2CSeparateStandingsResult | C2CHybridStandingsResult

/**
 * Deterministic weighted score: (proPoints * proWeight + collegePoints * collegeWeight) / 100.
 */
export function computeHybridScore(
  proPoints: number,
  collegePoints: number,
  proWeight: number,
  collegeWeight: number
): number {
  const w = proWeight + collegeWeight
  if (w <= 0) return proPoints + collegePoints
  return (proPoints * proWeight + collegePoints * collegeWeight) / w
}

/**
 * Resolve pro points for a roster from C2C best ball snapshots (periodKey ending _pro) or stub 0.
 */
async function getProPointsByRoster(leagueId: string): Promise<Map<string, number>> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const map = new Map<string, number>()
  for (const r of rosters) map.set(r.id, 0)
  const snapshots = await prisma.devyBestBallLineupSnapshot.findMany({
    where: { leagueId, periodKey: { endsWith: '_pro' } },
    select: { rosterId: true, totalPoints: true },
  })
  for (const s of snapshots) {
    if (s.totalPoints != null) {
      map.set(s.rosterId, (map.get(s.rosterId) ?? 0) + s.totalPoints)
    }
  }
  return map
}

/**
 * Resolve college points for a roster from C2C best ball snapshots (periodKey ending _college) or stub 0.
 */
async function getCollegePointsByRoster(leagueId: string): Promise<Map<string, number>> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const map = new Map<string, number>()
  for (const r of rosters) map.set(r.id, 0)
  const snapshots = await prisma.devyBestBallLineupSnapshot.findMany({
    where: { leagueId, periodKey: { endsWith: '_college' } },
    select: { rosterId: true, totalPoints: true },
  })
  for (const s of snapshots) {
    if (s.totalPoints != null) {
      map.set(s.rosterId, (map.get(s.rosterId) ?? 0) + s.totalPoints)
    }
  }
  return map
}

/**
 * Unified standings: one combined view. Uses combinedPoints = pro + college (or existing league totals).
 */
export async function getC2CUnifiedStandings(leagueId: string): Promise<C2CUnifiedStandingsResult> {
  const [rosters, proPoints, collegePoints] = await Promise.all([
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
    getProPointsByRoster(leagueId),
    getCollegePointsByRoster(leagueId),
  ])

  const rows: C2CStandingsRow[] = rosters.map((r, i) => {
    const pro = proPoints.get(r.id) ?? 0
    const college = collegePoints.get(r.id) ?? 0
    return {
      rosterId: r.id,
      platformUserId: r.platformUserId,
      rank: i + 1,
      proPoints: pro,
      collegePoints: college,
      combinedPoints: pro + college,
    }
  })
  rows.sort((a, b) => b.combinedPoints - a.combinedPoints)
  rows.forEach((row, i) => { row.rank = i + 1 })
  return { model: 'unified', rows }
}

/**
 * Separate standings: college and pro buckets, each ranked independently.
 */
export async function getC2CSeparateStandings(leagueId: string): Promise<C2CSeparateStandingsResult> {
  const [rosters, proPoints, collegePoints] = await Promise.all([
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
    getProPointsByRoster(leagueId),
    getCollegePointsByRoster(leagueId),
  ])

  const proRows: C2CStandingsRow[] = rosters.map((r) => ({
    rosterId: r.id,
    platformUserId: r.platformUserId,
    rank: 0,
    proPoints: proPoints.get(r.id) ?? 0,
    collegePoints: 0,
    combinedPoints: proPoints.get(r.id) ?? 0,
  }))
  proRows.sort((a, b) => b.proPoints - a.proPoints)
  proRows.forEach((row, i) => { row.rank = i + 1 })

  const collegeRows: C2CStandingsRow[] = rosters.map((r) => ({
    rosterId: r.id,
    platformUserId: r.platformUserId,
    rank: 0,
    proPoints: 0,
    collegePoints: collegePoints.get(r.id) ?? 0,
    combinedPoints: collegePoints.get(r.id) ?? 0,
  }))
  collegeRows.sort((a, b) => b.collegePoints - a.collegePoints)
  collegeRows.forEach((row, i) => { row.rank = i + 1 })

  return { model: 'separate', pro: proRows, college: collegeRows }
}

/**
 * Hybrid championship: deterministic weighted formula. Tie-breaker applied for ordering.
 */
export async function getC2CHybridStandings(leagueId: string): Promise<C2CHybridStandingsResult> {
  const config = await getC2CConfig(leagueId)
  if (!config) {
    return { model: 'hybrid', rows: [], proWeight: 60, collegeWeight: 40, playoffQualification: 'weighted', championshipTieBreaker: 'total_points' }
  }

  const proWeight = config.hybridProWeight ?? 60
  const collegeWeight = 100 - proWeight
  const playoffQualification = config.hybridPlayoffQualification ?? 'weighted'
  const championshipTieBreaker = config.hybridChampionshipTieBreaker ?? 'total_points'

  const [rosters, proPoints, collegePoints] = await Promise.all([
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
    getProPointsByRoster(leagueId),
    getCollegePointsByRoster(leagueId),
  ])

  const rows: C2CStandingsRow[] = rosters.map((r) => {
    const pro = proPoints.get(r.id) ?? 0
    const college = collegePoints.get(r.id) ?? 0
    const combined = computeHybridScore(pro, college, proWeight, collegeWeight)
    return {
      rosterId: r.id,
      platformUserId: r.platformUserId,
      rank: 0,
      proPoints: pro,
      collegePoints: college,
      combinedPoints: combined,
    }
  })

  if (championshipTieBreaker === 'pro_first') {
    rows.sort((a, b) => b.combinedPoints - a.combinedPoints || b.proPoints - a.proPoints)
  } else if (championshipTieBreaker === 'college_first') {
    rows.sort((a, b) => b.combinedPoints - a.combinedPoints || b.collegePoints - a.collegePoints)
  } else {
    rows.sort((a, b) => b.combinedPoints - a.combinedPoints)
  }
  rows.forEach((row, i) => { row.rank = i + 1 })

  return {
    model: 'hybrid',
    rows,
    proWeight,
    collegeWeight,
    playoffQualification,
    championshipTieBreaker,
  }
}

/**
 * Get standings by league config (unified | separate | hybrid).
 */
export async function getC2CStandings(leagueId: string): Promise<C2CStandingsResult> {
  const config = await getC2CConfig(leagueId)
  const model = (config?.standingsModel ?? 'unified') as 'unified' | 'separate' | 'hybrid'
  if (model === 'separate') return getC2CSeparateStandings(leagueId)
  if (model === 'hybrid') return getC2CHybridStandings(leagueId)
  return getC2CUnifiedStandings(leagueId)
}
