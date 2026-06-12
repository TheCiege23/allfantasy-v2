/**
 * getSurvivorLeagueState — canonical per-user state aggregator for Survivor leagues.
 *
 * Returns a single safe payload for Survivor hub UI:
 *   - phase / week
 *   - tribe state
 *   - merge state
 *   - challenge status
 *   - immunity status
 *   - voting status (user-gated: hidden until reveal)
 *   - exile status
 *   - idol status (user-gated: own idol only unless commissioner)
 *   - token balance (own)
 *   - elimination history
 *   - commissioner actions available to this user
 *   - warnings / pending-automation messages
 *
 * Never exposes other players' hidden idols or un-revealed votes.
 * Reads DB state only; does not mutate.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SurvivorStatePhase = 'setup' | 'pre_draft' | 'drafting' | 'pre_merge' | 'post_merge' | 'finale' | 'complete'

export interface SurvivorTribeStateSummary {
  id: string
  name: string
  memberCount: number
  isActive: boolean
  isEliminated: boolean
}

export interface SurvivorChallengeSummary {
  id: string
  week: number
  challengeType: string
  status: string
  winnerName: string | null
  automationStatus: 'not_started' | 'pending' | 'active' | 'finalized'
}

export interface SurvivorImmunitySummary {
  immuneTeamId: string | null
  immuneTeamName: string | null
  week: number | null
}

export interface SurvivorVotingStateSummary {
  councilId: string | null
  status: string | null
  week: number | null
  voteDeadline: string | null
  ownVoteCast: boolean
  revealComplete: boolean
  eliminatedName: string | null
  automationStatus: 'not_started' | 'pending' | 'active' | 'finalized'
}

export interface SurvivorExileStateSummary {
  isActive: boolean
  exileLeagueId: string | null
  currentWeek: number | null
  automationStatus: 'not_started' | 'pending' | 'active' | 'finalized'
}

export interface SurvivorIdolSummaryForUser {
  idolId: string
  powerType: string
  status: string
  foundWeek: number | null
  playedWeek: number | null
}

export interface SurvivorTokenSummaryForUser {
  balance: number
  totalEarned: number
  ledgerStatus: 'not_started' | 'pending' | 'active'
}

export interface SurvivorEliminationRecord {
  week: number
  userId: string
  displayName: string
  isJuror: boolean
}

export interface SurvivorCommissionerActions {
  canPauseAutomation: boolean
  canFinalizeChallenge: boolean
  canOverrideImmunity: boolean
  canLockVotes: boolean
  canRevealVotes: boolean
  canForceRevote: boolean
  canAssignExile: boolean
  canAssignIdol: boolean
  canGrantTokens: boolean
  canResolveElimination: boolean
}

export interface SurvivorLeagueState {
  leagueId: string
  phase: SurvivorStatePhase
  currentWeek: number
  castSize: number
  remainingPlayers: number
  mergeTriggered: boolean
  mergeWeek: number | null
  tribes: SurvivorTribeStateSummary[]
  challenge: SurvivorChallengeSummary | null
  immunity: SurvivorImmunitySummary
  voting: SurvivorVotingStateSummary
  exile: SurvivorExileStateSummary
  ownIdols: SurvivorIdolSummaryForUser[]
  ownTokens: SurvivorTokenSummaryForUser
  eliminations: SurvivorEliminationRecord[]
  commissionerActions: SurvivorCommissionerActions | null
  pendingAutomationWarnings: string[]
  isCommissioner: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPendingWarnings(
  challenge: SurvivorChallengeSummary | null,
  voting: SurvivorVotingStateSummary,
  exile: SurvivorExileStateSummary,
): string[] {
  const w: string[] = []
  if (!challenge || challenge.automationStatus === 'pending' || challenge.automationStatus === 'not_started') {
    w.push('Weekly challenge automation is pending. Commissioner must finalize challenges manually.')
  }
  if (voting.automationStatus === 'pending' || voting.automationStatus === 'not_started') {
    w.push('Tribal council vote automation is pending. Commissioner must lock and reveal votes manually.')
  }
  if (exile.automationStatus === 'pending' || exile.automationStatus === 'not_started') {
    w.push('Exile Island automation is pending. Commissioner must assign and complete exile manually.')
  }
  return w
}

function resolvePhase(
  dbPhase: string | null | undefined,
  mergeTriggered: boolean,
): SurvivorStatePhase {
  if (!dbPhase) return 'setup'
  if (dbPhase === 'pre_draft') return 'pre_draft'
  if (dbPhase === 'draft' || dbPhase === 'drafting') return 'drafting'
  if (dbPhase === 'merge' || dbPhase === 'post_merge') return 'post_merge'
  if (dbPhase === 'finale') return 'finale'
  if (dbPhase === 'complete' || dbPhase === 'ended') return 'complete'
  if (mergeTriggered) return 'post_merge'
  return 'pre_merge'
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getSurvivorLeagueState(
  leagueId: string,
  requestingUserId: string,
): Promise<SurvivorLeagueState | null> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return null

  // ── League + game state
  const [league, gameState] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        userId: true,
        survivorMode: true,
        survivorPhase: true,
        survivorMergeWeek: true,
        survivorPlayerCount: true,
      },
    }),
    prisma.survivorGameState.findUnique({ where: { leagueId } }),
  ])
  if (!league) return null

  const isCommissioner = league.userId === requestingUserId
  const currentWeek = gameState?.currentWeek ?? 1
  const mergeTriggered = gameState?.isMerged ?? false
  const phase = resolvePhase(gameState?.phase ?? league.survivorPhase, mergeTriggered)

  // ── Players
  const players = await prisma.survivorPlayer.findMany({
    where: { leagueId },
    select: {
      userId: true,
      displayName: true,
      playerState: true,
      eliminatedWeek: true,
      isJuror: true,
      hasImmunityThisWeek: true,
      totalTokensEarned: true,
      tokenBalance: true,
    },
  })

  const remainingPlayers = players.filter(p => p.playerState === 'active').length
  const castSize = players.length || (league.survivorPlayerCount ?? 16)

  // ── Tribes
  const tribes = await prisma.survivorTribe.findMany({
    where: { leagueId },
    include: { members: true },
  })
  const tribeSummaries: SurvivorTribeStateSummary[] = tribes.map(t => ({
    id: t.id,
    name: t.name,
    memberCount: t.members.length,
    isActive: t.isActive ?? true,
    isEliminated: !(t.isActive ?? true),
  }))

  // ── Current challenge (most recent for current week)
  const latestChallenge = await prisma.survivorChallenge.findFirst({
    where: { leagueId },
    orderBy: [{ week: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      week: true,
      challengeType: true,
      status: true,
      createdAt: true,
    },
  })
  const challengeSummary: SurvivorChallengeSummary | null = latestChallenge
    ? {
        id: latestChallenge.id,
        week: latestChallenge.week,
        challengeType: latestChallenge.challengeType ?? 'unknown',
        status: latestChallenge.status ?? 'pending',
        winnerName: null,
        automationStatus:
          latestChallenge.status === 'locked' || latestChallenge.status === 'complete'
            ? 'finalized'
            : 'pending',
      }
    : null

  // ── Immunity
  const immunePlayer = players.find(p => p.hasImmunityThisWeek)
  const immunity: SurvivorImmunitySummary = {
    immuneTeamId: null,
    immuneTeamName: immunePlayer?.displayName ?? null,
    week: immunePlayer ? currentWeek : null,
  }

  // ── Active tribal council
  const openCouncil = await prisma.survivorTribalCouncil.findFirst({
    where: { leagueId, status: { in: ['voting_open', 'votes_locked', 'reveal_in_progress'] } },
    include: { votes: true },
    orderBy: { createdAt: 'desc' },
  })
  const ownRoster = await prisma.roster.findFirst({
    where: { leagueId, userId: requestingUserId },
    select: { id: true },
  })
  const ownVoteCast = openCouncil && ownRoster
    ? openCouncil.votes.some(v => (v as any).voterRosterId === ownRoster.id || (v as any).voterUserId === requestingUserId)
    : false
  const voting: SurvivorVotingStateSummary = {
    councilId: openCouncil?.id ?? null,
    status: openCouncil?.status ?? null,
    week: openCouncil?.week ?? null,
    voteDeadline: openCouncil?.votingDeadline?.toISOString() ?? null,
    ownVoteCast,
    revealComplete: openCouncil?.status === 'complete' || openCouncil?.status === 'revealed',
    eliminatedName: openCouncil?.eliminatedUserId
      ? (players.find(p => p.userId === openCouncil.eliminatedUserId)?.displayName ?? null)
      : null,
    automationStatus: openCouncil ? 'active' : 'pending',
  }

  // ── Exile
  const exileIsland = await prisma.exileIsland.findFirst({ where: { leagueId } })
  const exile: SurvivorExileStateSummary = {
    isActive: exileIsland?.isActive ?? false,
    exileLeagueId: exileIsland?.leagueId ?? null,
    currentWeek: exileIsland?.currentWeek ?? null,
    automationStatus: exileIsland?.isActive ? 'active' : 'pending',
  }

  // ── Own idols (only this user's idols)
  const ownIdolRows = await prisma.survivorIdol.findMany({
    where: { leagueId, currentOwnerUserId: requestingUserId },
    select: {
      id: true,
      powerType: true,
      status: true,
      foundWeek: true,
      playedWeek: true,
    },
  })
  const ownIdols: SurvivorIdolSummaryForUser[] = ownIdolRows.map(i => ({
    idolId: i.id,
    powerType: i.powerType ?? 'unknown',
    status: i.status ?? 'hidden',
    foundWeek: i.foundWeek ?? null,
    playedWeek: i.playedWeek ?? null,
  }))

  // ── Own tokens
  const ownPlayerRow = players.find(p => p.userId === requestingUserId)
  const ownTokens: SurvivorTokenSummaryForUser = {
    balance: ownPlayerRow?.tokenBalance ?? 0,
    totalEarned: ownPlayerRow?.totalTokensEarned ?? 0,
    ledgerStatus: 'pending',
  }

  // ── Elimination history
  const eliminations: SurvivorEliminationRecord[] = players
    .filter(p => p.eliminatedWeek != null)
    .sort((a, b) => (a.eliminatedWeek ?? 0) - (b.eliminatedWeek ?? 0))
    .map(p => ({
      week: p.eliminatedWeek!,
      userId: p.userId,
      displayName: p.displayName ?? p.userId,
      isJuror: p.isJuror ?? false,
    }))

  // ── Commissioner actions
  const commissionerActions: SurvivorCommissionerActions | null = isCommissioner
    ? {
        canPauseAutomation: true,
        canFinalizeChallenge: !!latestChallenge && latestChallenge.status !== 'complete',
        canOverrideImmunity: true,
        canLockVotes: !!openCouncil && openCouncil.status === 'voting_open',
        canRevealVotes: !!openCouncil && openCouncil.status === 'votes_locked',
        canForceRevote: !!openCouncil,
        canAssignExile: true,
        canAssignIdol: true,
        canGrantTokens: true,
        canResolveElimination: !!openCouncil,
      }
    : null

  const pendingAutomationWarnings = buildPendingWarnings(challengeSummary, voting, exile)

  return {
    leagueId,
    phase,
    currentWeek,
    castSize,
    remainingPlayers,
    mergeTriggered,
    mergeWeek: league.survivorMergeWeek ?? gameState?.mergeWeek ?? null,
    tribes: tribeSummaries,
    challenge: challengeSummary,
    immunity,
    voting,
    exile,
    ownIdols,
    ownTokens,
    eliminations,
    commissionerActions,
    pendingAutomationWarnings,
    isCommissioner,
  }
}
