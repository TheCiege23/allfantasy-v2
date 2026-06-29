/**
 * Decision OS — Phase 2 Canonical World Assembly: the READ-ONLY data-access port.
 *
 * This is the ONLY file in the substrate permitted to import prisma, and it exposes ONLY read methods
 * (`findUnique` / `findMany`). There is intentionally no create/update/upsert/delete surface anywhere
 * in the world module, so the read-only guarantee is structural: nothing the assembler can reach is
 * able to write. In particular this NEVER calls `resolveRedraftRosterLookup` (which performs owner
 * repair via `prisma.redraftRoster.update`).
 */
import { prisma } from '@/lib/prisma'
import type {
  RawLeagueRow,
  RawPerformanceRow,
  RawRosterRow,
  RawTeamRow,
} from './facts'

export interface CanonicalWorldPort {
  loadLeague(leagueId: string): Promise<RawLeagueRow | null>
  loadTeams(leagueId: string): Promise<RawTeamRow[]>
  loadRosters(leagueId: string): Promise<RawRosterRow[]>
  loadPerformances(teamIds: string[], season: number): Promise<RawPerformanceRow[]>
}

export const defaultCanonicalWorldPort: CanonicalWorldPort = {
  async loadLeague(leagueId) {
    const row = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        sport: true,
        season: true,
        scoring: true,
        scoringPresetId: true,
        leagueType: true,
        isDynasty: true,
        rosterSize: true,
        starters: true,
        irSlots: true,
        taxiSlots: true,
        waiverType: true,
        waiverBudget: true,
        waiverMinBid: true,
        waiverHours: true,
        tradeReviewHours: true,
        tradeDeadlineWeek: true,
        draftPickTrading: true,
        settings: true,
        lastSyncedAt: true,
        syncStatus: true,
        platform: true,
        platformLeagueId: true,
      },
    })
    if (!row) return null
    return {
      id: row.id,
      sport: String(row.sport),
      season: row.season,
      scoring: row.scoring ?? null,
      scoringPresetId: row.scoringPresetId ?? null,
      leagueType: row.leagueType ?? null,
      isDynasty: row.isDynasty,
      rosterSize: row.rosterSize ?? null,
      starters: row.starters ?? null,
      irSlots: row.irSlots ?? null,
      taxiSlots: row.taxiSlots ?? null,
      waiverType: row.waiverType ?? null,
      waiverBudget: row.waiverBudget ?? null,
      waiverMinBid: row.waiverMinBid ?? null,
      waiverHours: row.waiverHours ?? null,
      tradeReviewHours: row.tradeReviewHours ?? null,
      tradeDeadlineWeek: row.tradeDeadlineWeek ?? null,
      draftPickTrading: row.draftPickTrading ?? null,
      settings: row.settings ?? null,
      lastSyncedAt: row.lastSyncedAt ?? null,
      syncStatus: row.syncStatus ?? null,
      platform: row.platform ?? null,
      platformLeagueId: row.platformLeagueId ?? null,
    }
  },

  async loadTeams(leagueId) {
    const rows = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: {
        id: true,
        externalId: true,
        ownerName: true,
        teamName: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        currentRank: true,
        role: true,
        isOrphan: true,
        isCommissioner: true,
        isCoCommissioner: true,
        platformUserId: true,
        claimedByUserId: true,
      },
    })
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId ?? '',
      ownerName: row.ownerName ?? '',
      teamName: row.teamName ?? '',
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      ties: row.ties ?? 0,
      pointsFor: row.pointsFor ?? 0,
      pointsAgainst: row.pointsAgainst ?? 0,
      currentRank: row.currentRank ?? null,
      role: row.role ?? 'member',
      isOrphan: row.isOrphan ?? false,
      isCommissioner: row.isCommissioner ?? false,
      isCoCommissioner: row.isCoCommissioner ?? false,
      platformUserId: row.platformUserId ?? null,
      claimedByUserId: row.claimedByUserId ?? null,
    }))
  },

  async loadRosters(leagueId) {
    const rows = await prisma.roster.findMany({
      where: { leagueId },
      select: {
        id: true,
        platformUserId: true,
        playerData: true,
        faabRemaining: true,
        waiverPriority: true,
        settings: true,
      },
    })
    return rows.map((row) => ({
      id: row.id,
      platformUserId: row.platformUserId ?? '',
      playerData: row.playerData ?? null,
      faabRemaining: row.faabRemaining ?? null,
      waiverPriority: row.waiverPriority ?? null,
      settings: row.settings ?? null,
    }))
  },

  async loadPerformances(teamIds, season) {
    if (teamIds.length === 0) return []
    const rows = await prisma.teamPerformance.findMany({
      where: { teamId: { in: teamIds }, season },
      select: {
        teamId: true,
        week: true,
        season: true,
        points: true,
        opponent: true,
        result: true,
      },
    })
    return rows.map((row) => ({
      teamId: row.teamId,
      week: row.week,
      season: row.season,
      points: row.points ?? 0,
      opponent: row.opponent ?? null,
      result: row.result ?? null,
    }))
  },
}
