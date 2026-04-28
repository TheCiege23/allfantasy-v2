import type { LeagueSport } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { NormalizedDraftEntry, ProjectionSourceTag } from '@/lib/draft-sports-models/types'

type Baseline = {
  avg: number
  min: number
  max: number
  count: number
}

export type ProjectionFallbackDiagnostics = {
  realProjectionCount: number
  fallbackProjectionCount: number
  fallbackBySource: Record<ProjectionSourceTag, number>
  stillMissingProjectionCount: number
}

type ApplyFallbackInput = {
  sport: LeagueSport
  entries: NormalizedDraftEntry[]
  prismaClient?: PrismaClient
}

const CORE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE'])
const IDP_POSITIONS = new Set(['DB', 'DL', 'LB', 'CB', 'S', 'DE', 'DT'])

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function hasProjection(entry: NormalizedDraftEntry): boolean {
  const value = toNum(entry.display?.stats?.fantasyPointsPerGame)
  return value !== null
}

function getAdp(entry: NormalizedDraftEntry): number | null {
  return toNum(entry.adp ?? entry.display?.stats?.adp ?? null)
}

function canonicalPos(position: string | null | undefined): string {
  const pos = String(position ?? '').trim().toUpperCase()
  if (pos === 'PK' || pos === 'KICKER') return 'K'
  if (pos === 'DST') return 'DEF'
  return pos
}

function computePercentileFromAdp(adp: number, sortedAdpAsc: number[]): number {
  if (sortedAdpAsc.length <= 1) return 0.5
  const idx = sortedAdpAsc.findIndex((v) => v >= adp)
  const rankIndex = idx >= 0 ? idx : sortedAdpAsc.length - 1
  return 1 - rankIndex / (sortedAdpAsc.length - 1)
}

function writeProjection(entry: NormalizedDraftEntry, fantasyPointsPerGame: number, source: ProjectionSourceTag): void {
  const rounded = round2(fantasyPointsPerGame)
  entry.display.stats.fantasyPointsPerGame = rounded
  entry.projectionSource = source
  entry.display.stats.projectionSource = source

  const adp = getAdp(entry)
  if (adp == null) {
    entry.display.stats.primaryStatLabel = 'PPG'
    entry.display.stats.primaryStatValue = rounded
    if (entry.display.stats.secondaryStatLabel === 'PPG') {
      entry.display.stats.secondaryStatLabel = null
      entry.display.stats.secondaryStatValue = null
    }
    return
  }

  if (!entry.display.stats.secondaryStatLabel) {
    entry.display.stats.secondaryStatLabel = 'PPG'
    entry.display.stats.secondaryStatValue = rounded
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

async function loadBaselines(prismaClient: PrismaClient): Promise<{
  byPosition: Map<string, Baseline>
  kickerDistributionDesc: number[]
}> {
  const rows = await prismaClient.playerSeasonStats.findMany({
    where: {
      sport: 'NFL',
      source: 'rolling_insights',
      seasonType: 'regular',
      gamesPlayed: { gte: 3 },
      fantasyPointsPerGame: { not: null, gt: 0 },
      position: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'PK'] },
    },
    select: {
      position: true,
      fantasyPointsPerGame: true,
    },
    take: 5000,
  })

  const byPositionValues = new Map<string, number[]>()
  const kickerValues: number[] = []

  for (const row of rows) {
    const pos = canonicalPos(row.position)
    const fppg = toNum(row.fantasyPointsPerGame)
    if (!fppg || fppg <= 0) continue
    if (!byPositionValues.has(pos)) byPositionValues.set(pos, [])
    byPositionValues.get(pos)!.push(fppg)
    if (pos === 'K') kickerValues.push(fppg)
  }

  const byPosition = new Map<string, Baseline>()
  for (const [pos, values] of byPositionValues.entries()) {
    const sorted = [...values].sort((a, b) => a - b)
    byPosition.set(pos, {
      avg: avg(values),
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      count: values.length,
    })
  }

  const kickerDistributionDesc = [...kickerValues].sort((a, b) => b - a)
  return { byPosition, kickerDistributionDesc }
}

function isRookieEntry(entry: NormalizedDraftEntry): boolean {
  if (entry.isRookie === true) return true
  const yearsExp = toNum(entry.yearsExp)
  return yearsExp === 0
}

export async function applyPositionAwareProjectionFallbacks(
  input: ApplyFallbackInput,
): Promise<{ entries: NormalizedDraftEntry[]; diagnostics: ProjectionFallbackDiagnostics }> {
  const diagnostics: ProjectionFallbackDiagnostics = {
    realProjectionCount: 0,
    fallbackProjectionCount: 0,
    fallbackBySource: {
      rolling_insights: 0,
      adp_position_fallback: 0,
      kicker_adp_binned_fallback: 0,
      rookie_adp_position_fallback: 0,
      team_def_baseline_fallback: 0,
    },
    stillMissingProjectionCount: 0,
  }

  if (input.sport !== 'NFL') {
    diagnostics.realProjectionCount = input.entries.filter((entry) => hasProjection(entry)).length
    diagnostics.stillMissingProjectionCount = input.entries.length - diagnostics.realProjectionCount
    return { entries: input.entries, diagnostics }
  }

  const prismaClient = input.prismaClient ?? (prisma as unknown as PrismaClient)
  const { byPosition, kickerDistributionDesc } = await loadBaselines(prismaClient)

  const entries = input.entries
  for (const entry of entries) {
    if (hasProjection(entry)) diagnostics.realProjectionCount += 1
  }

  const veteransByPos = new Map<string, NormalizedDraftEntry[]>()
  const rookiesByPos = new Map<string, NormalizedDraftEntry[]>()
  const kickers: NormalizedDraftEntry[] = []
  const teamDefs: NormalizedDraftEntry[] = []

  for (const entry of entries) {
    if (hasProjection(entry)) continue
    const pos = canonicalPos(entry.position)

    if (pos === 'DEF') {
      teamDefs.push(entry)
      continue
    }

    if (pos === 'K') {
      kickers.push(entry)
      continue
    }

    if (CORE_POSITIONS.has(pos)) {
      if (isRookieEntry(entry)) {
        const list = rookiesByPos.get(pos) ?? []
        list.push(entry)
        rookiesByPos.set(pos, list)
      } else {
        const list = veteransByPos.get(pos) ?? []
        list.push(entry)
        veteransByPos.set(pos, list)
      }
      continue
    }

    // Intentionally skip IDP/other positions until explicit per-position calibration exists.
    if (IDP_POSITIONS.has(pos)) continue
  }

  for (const [pos, bucket] of veteransByPos.entries()) {
    const baseline = byPosition.get(pos)
    if (!baseline || baseline.count < 10) continue

    const adpRanked = bucket
      .map((entry) => getAdp(entry))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)

    const low = Math.max(0.25, baseline.avg * 0.6)
    const high = Math.max(low + 0.5, baseline.avg * 1.25)

    for (const entry of bucket) {
      if (hasProjection(entry)) continue
      const adp = getAdp(entry)
      const pct = adp != null && adpRanked.length > 0 ? computePercentileFromAdp(adp, adpRanked) : 0.45
      const projected = low + pct * (high - low)
      writeProjection(entry, projected, 'adp_position_fallback')
      diagnostics.fallbackProjectionCount += 1
      diagnostics.fallbackBySource.adp_position_fallback += 1
    }
  }

  for (const [pos, bucket] of rookiesByPos.entries()) {
    const baseline = byPosition.get(pos)
    if (!baseline || baseline.count < 10) continue

    const adpRanked = bucket
      .map((entry) => getAdp(entry))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)

    const low = Math.max(0.2, baseline.avg * 0.4)
    const high = Math.max(low + 0.4, baseline.avg * 0.85)

    for (const entry of bucket) {
      if (hasProjection(entry)) continue
      const adp = getAdp(entry)
      const pct = adp != null && adpRanked.length > 0 ? computePercentileFromAdp(adp, adpRanked) : 0.35
      const projected = low + pct * (high - low)
      writeProjection(entry, projected, 'rookie_adp_position_fallback')
      diagnostics.fallbackProjectionCount += 1
      diagnostics.fallbackBySource.rookie_adp_position_fallback += 1
    }
  }

  if (kickers.length > 0) {
    const adpRanked = kickers
      .map((entry) => getAdp(entry))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)
    const kickerAvg = avg(kickerDistributionDesc)

    for (const entry of kickers) {
      if (hasProjection(entry)) continue
      const adp = getAdp(entry)
      let projected: number

      if (kickerDistributionDesc.length > 0 && adp != null && adpRanked.length > 0) {
        const pct = computePercentileFromAdp(adp, adpRanked)
        const idx = Math.max(0, Math.min(kickerDistributionDesc.length - 1, Math.round((1 - pct) * (kickerDistributionDesc.length - 1))))
        projected = kickerDistributionDesc[idx]
      } else if (kickerDistributionDesc.length > 0) {
        projected = kickerAvg
      } else {
        const baseline = byPosition.get('K')
        projected = baseline?.avg ?? 7.5
      }

      writeProjection(entry, projected, 'kicker_adp_binned_fallback')
      diagnostics.fallbackProjectionCount += 1
      diagnostics.fallbackBySource.kicker_adp_binned_fallback += 1
    }
  }

  if (teamDefs.length > 0) {
    const adpRanked = teamDefs
      .map((entry) => getAdp(entry))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)

    for (const entry of teamDefs) {
      if (hasProjection(entry)) continue
      const adp = getAdp(entry)
      const projected =
        adp != null && adpRanked.length > 0
          ? 5 + computePercentileFromAdp(adp, adpRanked) * 3
          : 6.0

      writeProjection(entry, projected, 'team_def_baseline_fallback')
      diagnostics.fallbackProjectionCount += 1
      diagnostics.fallbackBySource.team_def_baseline_fallback += 1
    }
  }

  diagnostics.stillMissingProjectionCount = entries.filter((entry) => !hasProjection(entry)).length

  return { entries, diagnostics }
}
