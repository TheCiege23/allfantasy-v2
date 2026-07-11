/**
 * Decision OS — Phase 3.3 Historical Intelligence: snapshot capture + retrieval.
 *
 * `intelligence_league_snapshot_history` is INSERT-only (see its schema.prisma
 * doc comment) — one new row per capture, so two real points in time can be
 * compared. This file only ever writes what `deriveLeagueBehavioralIntelligence`
 * already computed and reads back exactly what was written; it derives nothing
 * itself. Trend math lives in `trend.ts`, kept separate and pure (no IO).
 *
 * Explicit deps for testability, matching `RealDataProviderDeps`'s existing
 * pattern in `api/real-data-provider.ts`.
 */
import { prisma as defaultPrisma } from '@/lib/prisma'
import type { IntelligenceLeagueSnapshotHistory } from '@prisma/client'
import type { LeagueBehavioralIntelligence } from '../league-intelligence'

export interface LeagueHistoryPoint {
  capturedAt: string
  leagueEngagementScore: number
  leagueEngagementTier: string
  tradeActivityRate: number
  waiverActivityRate: number
  draftActivityRate: number
}

export interface LeagueSnapshotHistoryDeps {
  createSnapshot(row: {
    leagueId: string
    leagueEngagementScore: number
    leagueEngagementTier: string
    tradeActivityRate: number
    waiverActivityRate: number
    draftActivityRate: number
  }): Promise<void>
  findRecentSnapshots(leagueId: string, take: number): Promise<LeagueHistoryPoint[]>
}

const defaultDeps: LeagueSnapshotHistoryDeps = {
  async createSnapshot(row) {
    await defaultPrisma.intelligenceLeagueSnapshotHistory.create({ data: row })
  },
  async findRecentSnapshots(leagueId, take) {
    const rows = await defaultPrisma.intelligenceLeagueSnapshotHistory.findMany({
      where: { leagueId },
      orderBy: { capturedAt: 'desc' },
      take,
    })
    return rows.map((r: IntelligenceLeagueSnapshotHistory) => ({
      capturedAt: r.capturedAt.toISOString(),
      leagueEngagementScore: r.leagueEngagementScore,
      leagueEngagementTier: r.leagueEngagementTier,
      tradeActivityRate: r.tradeActivityRate,
      waiverActivityRate: r.waiverActivityRate,
      draftActivityRate: r.draftActivityRate,
    }))
  },
}

/**
 * Writes one new history row from already-derived league intelligence.
 * Read-only w.r.t. computation — never recomputes or estimates anything,
 * only persists what the caller already has. Safe to call repeatedly (each
 * call adds a new point; it never overwrites a previous one).
 */
export async function captureLeagueSnapshotHistory(
  intel: LeagueBehavioralIntelligence,
  deps: LeagueSnapshotHistoryDeps = defaultDeps,
): Promise<void> {
  await deps.createSnapshot({
    leagueId: intel.leagueId,
    leagueEngagementScore: Math.round(intel.leagueEngagementScore),
    leagueEngagementTier: intel.leagueEngagementTier,
    tradeActivityRate: intel.tradeActivity.perManagerRate,
    waiverActivityRate: intel.waiverActivity.perManagerRate,
    draftActivityRate: intel.draftActivity.perManagerRate,
  })
}

/** Most recent snapshots first (index 0 = latest). */
export async function getRecentLeagueSnapshots(
  leagueId: string,
  take: number = 2,
  deps: LeagueSnapshotHistoryDeps = defaultDeps,
): Promise<LeagueHistoryPoint[]> {
  return deps.findRecentSnapshots(leagueId, take)
}
