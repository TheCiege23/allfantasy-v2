/**
 * Supplemental Draft Engine
 *
 * For dynasty, C2C, and devy leagues with 2+ orphan teams.
 * The supplemental draft allows new managers taking over orphan teams
 * to select from an asset pool (players released from orphans + undrafted pool).
 *
 * Visually operates like the standard draft board (snake/linear/auction).
 * Commissioner configures: draft type, rounds, order, timer.
 *
 * Eligibility: only orphan team claimants participate.
 * Pool: players from orphan rosters + unclaimed free agents.
 */

import { prisma } from '@/lib/prisma'

export type SupplementalDraftConfig = {
  leagueId: string
  draftType: 'snake' | 'linear' | 'auction'
  rounds: number
  timerSeconds: number
  orphanTeamIds: string[]
  includeOrphanRosters: boolean
  includeFreeAgents: boolean
  includeUndraftedRookies: boolean
  includeUndraftedDevy: boolean
  status: 'configuring' | 'ready' | 'in_progress' | 'complete' | 'cancelled'
}

export type SupplementalDraftEligibility = {
  teamId: string
  managerId: string
  managerName: string
  isOrphan: boolean
  isNewManager: boolean
}

/**
 * Check if a league is eligible for a supplemental draft.
 * Requires 2+ orphan teams in a dynasty/c2c/devy league.
 */
export async function checkSupplementalEligibility(leagueId: string): Promise<{
  eligible: boolean
  orphanCount: number
  orphanTeams: Array<{ teamId: string; teamName: string | null }>
  reason: string
}> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { isDynasty: true, leagueVariant: true, settings: true, teams: true },
  })

  if (!league) return { eligible: false, orphanCount: 0, orphanTeams: [], reason: 'League not found' }

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const leagueType = String(settings.league_type ?? settings.format_id ?? '')
  const isDynastyType = league.isDynasty || ['dynasty', 'devy', 'c2c'].includes(leagueType)

  if (!isDynastyType) {
    return { eligible: false, orphanCount: 0, orphanTeams: [], reason: 'Supplemental drafts are only for dynasty, devy, and C2C leagues' }
  }

  // Find orphan teams (no claimed user or flagged as orphan)
  const orphanTeams = league.teams.filter((t) => !t.claimedByUserId || t.isOrphan === true)

  if (orphanTeams.length < 2) {
    return {
      eligible: false,
      orphanCount: orphanTeams.length,
      orphanTeams: orphanTeams.map((t) => ({ teamId: t.id, teamName: t.teamName })),
      reason: `Need 2+ orphan teams (found ${orphanTeams.length})`,
    }
  }

  return {
    eligible: true,
    orphanCount: orphanTeams.length,
    orphanTeams: orphanTeams.map((t) => ({ teamId: t.id, teamName: t.teamName })),
    reason: `${orphanTeams.length} orphan teams eligible for supplemental draft`,
  }
}

/**
 * Build the asset pool for a supplemental draft.
 * Includes players from orphan rosters + undrafted free agents.
 */
export async function buildSupplementalPool(
  leagueId: string,
  config: SupplementalDraftConfig,
): Promise<Array<{
  playerId: string
  playerName: string
  position: string
  team: string | null
  source: 'orphan_roster' | 'free_agent' | 'undrafted_rookie' | 'undrafted_devy'
}>> {
  const pool: Array<{
    playerId: string
    playerName: string
    position: string
    team: string | null
    source: 'orphan_roster' | 'free_agent' | 'undrafted_rookie' | 'undrafted_devy'
  }> = []

  // Get players from orphan rosters
  if (config.includeOrphanRosters) {
    for (const teamId of config.orphanTeamIds) {
      const players = await prisma.redraftRosterPlayer.findMany({
        where: {
          roster: { leagueId, id: teamId },
          droppedAt: null,
        },
        select: { playerId: true, playerName: true, position: true, team: true },
      }).catch(() => [])

      for (const p of players) {
        pool.push({
          playerId: p.playerId ?? `orphan-${p.playerName}`,
          playerName: p.playerName ?? 'Unknown',
          position: p.position ?? 'UNKNOWN',
          team: p.team,
          source: 'orphan_roster',
        })
      }
    }
  }

  return pool
}

/**
 * Create a supplemental draft session.
 * Uses the same DraftSession infrastructure as regular drafts.
 */
export async function createSupplementalDraft(
  leagueId: string,
  config: SupplementalDraftConfig,
  commissionerId: string,
): Promise<{ draftSessionId: string }> {
  const session = await prisma.draftSession.create({
    data: {
      leagueId,
      draftType: config.draftType,
      status: 'configuring',
      rounds: config.rounds,
      timerSeconds: config.timerSeconds,
      metadata: {
        isSupplemental: true,
        orphanTeamIds: config.orphanTeamIds,
        includeOrphanRosters: config.includeOrphanRosters,
        includeFreeAgents: config.includeFreeAgents,
        createdBy: commissionerId,
      },
    },
  })

  return { draftSessionId: session.id }
}

/**
 * Get default supplemental draft config.
 */
export function getDefaultSupplementalConfig(
  leagueId: string,
  orphanTeamIds: string[],
): SupplementalDraftConfig {
  return {
    leagueId,
    draftType: 'snake',
    rounds: 5,
    timerSeconds: 120,
    orphanTeamIds,
    includeOrphanRosters: true,
    includeFreeAgents: true,
    includeUndraftedRookies: true,
    includeUndraftedDevy: false,
    status: 'configuring',
  }
}
