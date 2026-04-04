/**
 * Survivor game state coordinator: phase/week transitions, Redraft→Survivor weekly score bridge, tribal hooks.
 * Delegates rules to existing engines (tribe, voting, exile, idol, immunity).
 */

import type { SurvivorGameState } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assignPlayersToTribes, executeMerge, executeTribeSwap } from '@/lib/survivor/tribeEngine'
import { seedIdolsAfterDraft, expireIdolsAtMerge } from '@/lib/survivor/idolEngine'
import { openTribalCouncil, lockVoting } from '@/lib/survivor/votingEngine'
import { scoreExileWeek } from '@/lib/survivor/exileEngine'
import { openFinale, openJuryPhase } from '@/lib/survivor/juryEngine'
import { clearWeeklyImmunity } from '@/lib/survivor/immunityEngine'
import { postHostMessage } from '@/lib/survivor/hostEngine'
import { logSurvivorAuditEntry } from '@/lib/survivor/auditEntry'
import { getSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'

async function sumRedraftStartersFantasy(
  rosterId: string,
  week: number,
  season: { season: number },
): Promise<{ pts: number; allFinalized: boolean }> {
  const starters = await prisma.redraftRosterPlayer.findMany({
    where: { rosterId, droppedAt: null, slotType: { notIn: ['bench', 'taxi'] } },
  })
  if (starters.length === 0) return { pts: 0, allFinalized: true }
  let pts = 0
  let allFinalized = true
  for (const p of starters) {
    const row = await prisma.playerWeeklyScore.findUnique({
      where: {
        playerId_week_season_sport: {
          playerId: p.playerId,
          week,
          season: season.season,
          sport: p.sport,
        },
      },
    })
    pts += row?.fantasyPts ?? 0
    if (!row?.isFinalized) allFinalized = false
  }
  return { pts, allFinalized }
}

export async function getOrCreateSurvivorGameState(leagueId: string): Promise<SurvivorGameState> {
  const existing = await prisma.survivorGameState.findUnique({ where: { leagueId } })
  if (existing) return existing
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorPhase: true },
  })
  return prisma.survivorGameState.create({
    data: {
      leagueId,
      phase: league?.survivorPhase ?? 'pre_draft',
      currentWeek: 0,
    },
  })
}

async function logPhaseTransition(
  leagueId: string,
  fromPhase: string,
  toPhase: string,
  week: number,
  triggeredBy: string,
  triggeredByUserId?: string | null,
  notes?: string,
): Promise<void> {
  await prisma.survivorPhaseTransition.create({
    data: {
      leagueId,
      fromPhase,
      toPhase,
      week,
      triggeredBy,
      triggeredByUserId: triggeredByUserId ?? undefined,
      notes,
    },
  })
}

export type AdvancePhaseOptions = {
  /** Target phase (maps to `League.survivorPhase` string and automation row). */
  toPhase: string
  notes?: string
}

/**
 * Moves the season to `opts.toPhase` and runs the appropriate setup hooks once.
 */
export async function advancePhase(
  leagueId: string,
  triggeredBy: string,
  triggeredByUserId: string | undefined,
  opts: AdvancePhaseOptions,
): Promise<SurvivorGameState> {
  const gs = await getOrCreateSurvivorGameState(leagueId)
  const fromPhase = gs.phase
  const toPhase = opts.toPhase
  if (fromPhase === toPhase) return gs

  await logPhaseTransition(leagueId, fromPhase, toPhase, gs.currentWeek, triggeredBy, triggeredByUserId, opts.notes)

  if (toPhase === 'pre_merge' || toPhase === 'drafting') {
    await assignPlayersToTribes(leagueId, 'auto').catch(() => {})
    await seedIdolsAfterDraft(leagueId, 'random').catch(() => {})
    const active = await prisma.survivorPlayer.count({ where: { leagueId, playerState: 'active' } })
    const tribeRows = await prisma.survivorTribe.count({
      where: { leagueId, isActive: true },
    })
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: {
        phase: toPhase,
        preMergeStartedAt: new Date(),
        activePlayerCount: active,
        activeTribeCount: tribeRows,
        draftCompletedAt: new Date(),
      },
    })
    await prisma.league.update({ where: { id: leagueId }, data: { survivorPhase: 'pre_merge' } })
    await postHostMessage(leagueId, 'season_start', { week: gs.currentWeek }, 'league_chat').catch(() => {})
  } else if (toPhase === 'post_swap') {
    await executeTribeSwap(leagueId, gs.currentWeek, 'random_shuffle').catch(() => {})
    await prisma.league.update({ where: { id: leagueId }, data: { survivorPhase: 'post_swap' } })
    await prisma.survivorGameState.update({ where: { leagueId }, data: { phase: 'post_swap' } })
  } else if (toPhase === 'merging' || toPhase === 'merge') {
    await executeMerge(leagueId, gs.currentWeek).catch(() => {})
    await expireIdolsAtMerge(leagueId).catch(() => {})
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: { phase: 'post_merge', mergeTriggeredAt: new Date() },
    })
    await prisma.league.update({ where: { id: leagueId }, data: { survivorPhase: 'merge' } })
  } else if (toPhase === 'jury') {
    await openJuryPhase(leagueId)
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: { phase: 'jury', juryStartedAt: new Date() },
    })
  } else if (toPhase === 'finale') {
    const finalists = await prisma.survivorPlayer.findMany({
      where: { leagueId, isFinalist: true },
      select: { userId: true },
    })
    await openFinale(
      leagueId,
      finalists.length ? finalists.map((f) => f.userId) : [],
    ).catch(() => {})
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: { phase: 'finale', finaleStartedAt: new Date() },
    })
  } else {
    await prisma.league.update({ where: { id: leagueId }, data: { survivorPhase: toPhase } })
    await prisma.survivorGameState.update({ where: { leagueId }, data: { phase: toPhase } })
  }

  return getOrCreateSurvivorGameState(leagueId)
}

export async function advanceWeek(leagueId: string): Promise<void> {
  const gs = await getOrCreateSurvivorGameState(leagueId)
  const next = gs.currentWeek + 1
  await clearWeeklyImmunity(leagueId)
  await prisma.survivorGameState.update({
    where: { leagueId },
    data: {
      currentWeek: next,
      weekStartedAt: new Date(),
      needsChallengeLock: true,
      needsTribalLock: true,
      weekScoringFinalAt: null,
    },
  })
  await logSurvivorAuditEntry({
    leagueId,
    week: next,
    category: 'automation',
    action: 'WEEK_ADVANCED',
    data: { week: next },
    isVisibleToPublic: true,
  })
}

export async function syncWeeklyScores(leagueId: string, week: number): Promise<void> {
  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
  })
  if (!season) return

  const players = await prisma.survivorPlayer.findMany({
    where: { leagueId, playerState: { in: ['active', 'exile'] } },
  })

  for (const sp of players) {
    if (!sp.redraftRosterId) continue
    const { pts, allFinalized } = await sumRedraftStartersFantasy(sp.redraftRosterId, week, season)
    const boost = 0
    const pen = 0
    const final = pts + boost - pen
    await prisma.survivorWeeklyScore.upsert({
      where: {
        leagueId_userId_week: { leagueId, userId: sp.userId, week },
      },
      create: {
        leagueId,
        userId: sp.userId,
        week,
        fantasyScore: pts,
        pointBoostApplied: boost,
        pointPenaltyApplied: pen,
        finalScore: final,
        tribeId: sp.tribeId,
        isFinalized: allFinalized,
        finalizedAt: allFinalized ? new Date() : null,
      },
      update: {
        fantasyScore: pts,
        finalScore: final,
        isFinalized: allFinalized,
        finalizedAt: allFinalized ? new Date() : null,
      },
    })
  }

  const scores = await prisma.survivorWeeklyScore.findMany({ where: { leagueId, week } })
  const byTribe = new Map<string, number>()
  for (const s of scores) {
    if (!s.tribeId || !s.countedTowardTribeTotal) continue
    byTribe.set(s.tribeId, (byTribe.get(s.tribeId) ?? 0) + s.finalScore)
  }
  let bestTribe: string | null = null
  let best = -Infinity
  for (const [tid, tot] of byTribe.entries()) {
    if (tot > best) {
      best = tot
      bestTribe = tid
    }
  }

  let bestPlayer: string | null = null
  let bestP = -Infinity
  for (const s of scores) {
    if (s.finalScore > bestP) {
      bestP = s.finalScore
      bestPlayer = s.userId
    }
  }

  const leagueRow = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorPhase: true },
  })
  const phase = leagueRow?.survivorPhase
  const postMerge = phase === 'merge' || phase === 'jury' || phase === 'finale'

  await prisma.survivorGameState.update({
    where: { leagueId },
    data: {
      immuneTribeId: postMerge ? null : bestTribe,
      immunePlayerId: postMerge ? bestPlayer : null,
      lastAutomationRun: new Date(),
      lastError: null,
    },
  })
}

export async function allScoresFinalizedForWeek(leagueId: string, week: number): Promise<boolean> {
  const season = await prisma.redraftSeason.findFirst({ where: { leagueId } })
  if (!season) return false
  const players = await prisma.survivorPlayer.findMany({
    where: { leagueId, playerState: 'active' },
    select: { redraftRosterId: true },
  })
  const rosterIds = [...new Set(players.map((p) => p.redraftRosterId).filter(Boolean))] as string[]
  if (rosterIds.length === 0) return false
  for (const rid of rosterIds) {
    const { allFinalized } = await sumRedraftStartersFantasy(rid, week, season)
    if (!allFinalized) return false
  }
  return true
}

export async function finalizeWeeklyScores(leagueId: string, week: number): Promise<void> {
  await prisma.survivorWeeklyScore.updateMany({
    where: { leagueId, week },
    data: { isFinalized: true, finalizedAt: new Date() },
  })
  await prisma.survivorGameState.update({
    where: { leagueId },
    data: {
      weekScoringFinalAt: new Date(),
      needsTribalLock: true,
    },
  })
}

export async function triggerTribalOpen(leagueId: string): Promise<void> {
  const gs = await getOrCreateSurvivorGameState(leagueId)
  const config = await getSurvivorConfig(leagueId)
  if (!config) return

  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const immune = gs.immuneTribeId
  const tribes = await prisma.survivorTribe.findMany({
    where: { leagueId, isActive: true },
    select: { id: true },
  })
  const tribeId =
    immune && tribes.some((t) => t.id !== immune)
      ? tribes.find((t) => t.id !== immune)?.id ?? null
      : tribes[0]?.id ?? null

  const { id: councilId } = await openTribalCouncil(leagueId, gs.currentWeek, tribeId, deadline)

  await prisma.survivorGameState.update({
    where: { leagueId },
    data: {
      activeCouncilId: councilId,
      tribalOpenedAt: new Date(),
      tribalDeadline: deadline,
      needsTribalLock: false,
    },
  })
}

export async function processTribalDeadline(leagueId: string): Promise<void> {
  const gs = await prisma.survivorGameState.findUnique({ where: { leagueId } })
  if (!gs?.activeCouncilId) return
  const council = await prisma.survivorTribalCouncil.findUnique({ where: { id: gs.activeCouncilId } })
  if (!council || council.status !== 'voting_open') return
  const dl = council.votingDeadline ?? council.voteDeadlineAt
  if (dl && new Date(dl) > new Date()) return
  await lockVoting(gs.activeCouncilId)
  await prisma.survivorGameState.update({
    where: { leagueId },
    data: { tribalRevealAt: new Date() },
  })
}

export { scoreExileWeek }
