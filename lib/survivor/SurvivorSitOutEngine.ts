import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { enqueueNotification } from './notificationEngine'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { getTribesWithMembers } from './SurvivorTribeService'
import { logSurvivorAuditEntry } from './auditEntry'

const CHIMMY_HOST_USER_ID = 'survivor-ai-host'
const CHIMMY_HOST_NAME = '@Chimmy'

export type SurvivorSitOutAction = {
  id: string
  leagueId: string
  week: number | null
  actionType: string
  commissionerId: string
  targetUserId: string | null
  targetTribeId: string | null
  description: string
  createdAt: Date
  executedAt: Date
}

export type SurvivorTribeBalanceState = {
  leagueId: string
  week: number
  merged: boolean
  tribeSizes: Array<{ tribeId: string; tribeName: string; activeCount: number }>
  minTribeSize: number
  maxTribeSize: number
  shouldSuggestShuffle: boolean
  suggestionReason: string | null
}

export type SurvivorSitOutCandidate = {
  rosterId: string
  userId: string
  displayName: string
  tribeId: string
}

export type SitOutNominationResult =
  | { ok: true; sitOutId: string; nominatedUserId: string; nominatedDisplayName: string }
  | { ok: false; error: string; eligibleCandidates?: SurvivorSitOutCandidate[] }

export type SitOutResponseResult =
  | { ok: true; status: 'accepted' | 'declined'; sitOutId: string }
  | { ok: false; error: string }

export type SitOutMiniGameGuard = {
  blocked: boolean
  sitOutExcludedUserIds: string[]
  reason?: string
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function toPrismaJson(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

function toSitOutAction(
  row: Awaited<ReturnType<typeof prisma.survivorCommissionerAction.findFirst>> extends infer T
    ? NonNullable<T>
    : never,
): SurvivorSitOutAction {
  return {
    ...row,
    createdAt: row.executedAt,
  }
}

function hasSameWeekPendingNomination(actions: SurvivorSitOutAction[], nominatedUserId: string): boolean {
  return actions.some((row) => row.actionType === 'sit_out_nominated' && row.targetUserId === nominatedUserId)
}

async function postToTribeChat(leagueId: string, tribeId: string, content: string, cardData?: Record<string, unknown>): Promise<void> {
  const channel = await prisma.survivorChatChannel.findFirst({
    where: { leagueId, channelType: 'tribe', tribeId },
    select: { id: true },
  })
  if (!channel) return

  await prisma.survivorChatMessage.create({
    data: {
      leagueId,
      channelId: channel.id,
      channelType: 'tribe',
      senderUserId: CHIMMY_HOST_USER_ID,
      senderName: CHIMMY_HOST_NAME,
      senderIsHost: true,
      isSystemMessage: true,
      content,
      contentType: 'announcement',
      cardData: cardData as object | undefined,
    },
  })
}

async function getAcceptedSitOutActions(leagueId: string, week: number): Promise<SurvivorSitOutAction[]> {
  const rows = await prisma.survivorCommissionerAction.findMany({
    where: {
      leagueId,
      week,
      actionType: 'sit_out_accepted',
      wasConfirmed: true,
    },
    orderBy: { executedAt: 'asc' },
  })
  return rows.map(toSitOutAction)
}

async function getNominatedAndAcceptedActions(leagueId: string, week: number): Promise<SurvivorSitOutAction[]> {
  const rows = await prisma.survivorCommissionerAction.findMany({
    where: {
      leagueId,
      week,
      actionType: { in: ['sit_out_nominated', 'sit_out_accepted', 'sit_out_declined'] },
    },
    orderBy: { executedAt: 'asc' },
  })
  return rows.map(toSitOutAction)
}

export async function getSurvivorTribeBalanceState(leagueId: string, week: number): Promise<SurvivorTribeBalanceState> {
  const [league, tribes] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { survivorPhase: true } }),
    getTribesWithMembers(leagueId),
  ])

  const merged = league?.survivorPhase === 'merge' || league?.survivorPhase === 'jury' || league?.survivorPhase === 'finale'
  if (merged || tribes.length === 0) {
    return {
      leagueId,
      week,
      merged,
      tribeSizes: [],
      minTribeSize: 0,
      maxTribeSize: 0,
      shouldSuggestShuffle: false,
      suggestionReason: null,
    }
  }

  const activePlayers = await prisma.survivorPlayer.findMany({
    where: { leagueId, playerState: 'active' },
    select: { redraftRosterId: true },
  })
  const activeRosterIds = new Set(activePlayers.map((p) => p.redraftRosterId).filter((id): id is string => Boolean(id)))

  const tribeSizes = tribes.map((tribe) => ({
    tribeId: tribe.id,
    tribeName: tribe.name,
    activeCount: tribe.members.filter((m) => activeRosterIds.has(m.rosterId)).length,
  }))
  const minTribeSize = Math.min(...tribeSizes.map((t) => t.activeCount))
  const maxTribeSize = Math.max(...tribeSizes.map((t) => t.activeCount))
  const shouldSuggestShuffle = minTribeSize <= 2

  return {
    leagueId,
    week,
    merged,
    tribeSizes,
    minTribeSize,
    maxTribeSize,
    shouldSuggestShuffle,
    suggestionReason: shouldSuggestShuffle
      ? 'At least one active tribe has dropped to 2 or fewer members.'
      : null,
  }
}

export async function getEligibleSitOutCandidates(
  leagueId: string,
  tribeId: string,
  week: number,
): Promise<SurvivorSitOutCandidate[]> {
  const [members, lastWeekAccepted] = await Promise.all([
    prisma.survivorTribeMember.findMany({ where: { tribeId }, select: { rosterId: true } }),
    prisma.survivorCommissionerAction.findMany({
      where: {
        leagueId,
        week: Math.max(1, week - 1),
        actionType: 'sit_out_accepted',
        wasConfirmed: true,
      },
      select: { targetUserId: true },
    }),
  ])
  if (members.length === 0) return []

  const rosterIds = members.map((m) => m.rosterId)
  const [rosters, players] = await Promise.all([
    prisma.roster.findMany({
      where: { id: { in: rosterIds }, leagueId },
      select: { id: true, platformUserId: true },
    }),
    prisma.survivorPlayer.findMany({
      where: {
        leagueId,
        redraftRosterId: { in: rosterIds },
        playerState: 'active',
      },
      select: {
        redraftRosterId: true,
        userId: true,
        displayName: true,
        hasImmunityThisWeek: true,
      },
    }),
  ])

  const previousWeekSitOutUserIds = new Set(lastWeekAccepted.map((row) => row.targetUserId).filter((id): id is string => Boolean(id)))
  const userByRosterId = new Map(rosters.map((r) => [r.id, r.platformUserId]).filter((entry): entry is [string, string] => Boolean(entry[1])))

  return players
    .filter((player) => {
      if (player.hasImmunityThisWeek) return false
      const rosterId = player.redraftRosterId
      if (!rosterId) return false
      const rosterUserId = userByRosterId.get(rosterId)
      if (!rosterUserId) return false
      if (previousWeekSitOutUserIds.has(rosterUserId)) return false
      return true
    })
    .map((player) => ({
      rosterId: player.redraftRosterId ?? '',
      userId: player.userId,
      displayName: player.displayName,
      tribeId,
    }))
    .filter((candidate) => Boolean(candidate.rosterId))
}

export async function nominateSurvivorSitOut(input: {
  leagueId: string
  week: number
  nominatorUserId: string
  nominatorRosterId: string
  tribeId: string
  nominatedRosterId: string
  command: string
}): Promise<SitOutNominationResult> {
  const { leagueId, week, nominatorUserId, nominatorRosterId, tribeId, nominatedRosterId, command } = input

  const [league, nomineeRoster, nomineePlayer, nominatorPlayer, existingForWeek, eligible] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { survivorPhase: true } }),
    prisma.roster.findFirst({
      where: { id: nominatedRosterId, leagueId },
      select: { id: true, platformUserId: true },
    }),
    prisma.survivorPlayer.findFirst({
      where: { leagueId, redraftRosterId: nominatedRosterId },
      select: { userId: true, displayName: true, playerState: true },
    }),
    prisma.survivorPlayer.findFirst({
      where: { leagueId, redraftRosterId: nominatorRosterId },
      select: { userId: true, tribeId: true, playerState: true },
    }),
    getNominatedAndAcceptedActions(leagueId, week),
    getEligibleSitOutCandidates(leagueId, tribeId, week),
  ])

  if (league?.survivorPhase === 'merge' || league?.survivorPhase === 'jury' || league?.survivorPhase === 'finale') {
    return { ok: false, error: 'Sit-out nominations are pre-merge only.' }
  }
  if (!nominatorPlayer || nominatorPlayer.playerState !== 'active') {
    return { ok: false, error: 'Only active tribe members can nominate a sit-out.' }
  }
  if (nominatorPlayer.tribeId !== tribeId) {
    return { ok: false, error: 'Sit-out nominations must be submitted from your own tribe chat.' }
  }
  if (!nomineeRoster?.platformUserId || !nomineePlayer) {
    return { ok: false, error: 'Could not resolve that manager in this Survivor league.', eligibleCandidates: eligible }
  }
  if (nomineePlayer.playerState !== 'active') {
    return { ok: false, error: 'Only active managers can be nominated to sit out.', eligibleCandidates: eligible }
  }

  const candidateAllowed = eligible.some((candidate) => candidate.userId === nomineeRoster.platformUserId)
  if (!candidateAllowed) {
    return {
      ok: false,
      error: 'That manager is not eligible to sit out right now (immunity or back-to-back rule).',
      eligibleCandidates: eligible,
    }
  }
  if (hasSameWeekPendingNomination(existingForWeek, nomineeRoster.platformUserId)) {
    return { ok: false, error: 'A pending sit-out nomination already exists for that manager this week.' }
  }
  if (existingForWeek.some((row) => row.actionType === 'sit_out_accepted' && row.targetUserId === nomineeRoster.platformUserId)) {
    return { ok: false, error: 'This manager already accepted a sit-out for the current week.' }
  }

  const created = await prisma.survivorCommissionerAction.create({
    data: {
      leagueId,
      commissionerId: nominatorUserId,
      week,
      actionType: 'sit_out_nominated',
      targetUserId: nomineeRoster.platformUserId,
      targetTribeId: tribeId,
      description: `${nomineePlayer.displayName} was nominated to sit out (pending acceptance).`,
      previousState: {
        status: 'none',
      } as object,
      newState: {
        status: 'pending',
        nominatedByUserId: nominatorUserId,
        nominatedByRosterId: nominatorRosterId,
        nominatedRosterId,
        command,
      } as object,
      wasConfirmed: false,
    },
  })

  await Promise.all([
    enqueueNotification(leagueId, 'sit_out_nomination', {
      recipientUserId: nomineeRoster.platformUserId,
      title: '🪑 Sit-out nomination pending',
      body: `Your tribe nominated you to sit out this week. Confirm Yes/No in Survivor.`,
      deepLinkPath: `/league/${leagueId}/survivor?sitOutId=${created.id}`,
      urgency: 'high',
      isSpoilerSafe: true,
    }),
    postToTribeChat(
      leagueId,
      tribeId,
      `${nomineePlayer.displayName} was nominated to sit out this week. This only becomes official if they click Yes.`,
      {
        type: 'sit_out_nomination',
        sitOutId: created.id,
        status: 'pending',
        nominatedUserId: nomineeRoster.platformUserId,
        nominatedDisplayName: nomineePlayer.displayName,
        week,
      },
    ),
    logSurvivorAuditEntry({
      leagueId,
      week,
      category: 'sit_out',
      action: 'SIT_OUT_NOMINATED',
      actorUserId: nominatorUserId,
      targetUserId: nomineeRoster.platformUserId,
      targetTribeId: tribeId,
      relatedEntityId: created.id,
      relatedEntityType: 'survivor_commissioner_action',
      data: {
        status: 'pending',
        nominatedByRosterId: nominatorRosterId,
      },
      isVisibleToCommissioner: true,
      isVisibleToPublic: false,
    }),
  ])

  return {
    ok: true,
    sitOutId: created.id,
    nominatedUserId: nomineeRoster.platformUserId,
    nominatedDisplayName: nomineePlayer.displayName,
  }
}

export async function respondToSurvivorSitOut(input: {
  leagueId: string
  sitOutId: string
  responderUserId: string
  accept: boolean
}): Promise<SitOutResponseResult> {
  const nomination = await prisma.survivorCommissionerAction.findFirst({
    where: {
      id: input.sitOutId,
      leagueId: input.leagueId,
    },
  })
  if (!nomination) return { ok: false, error: 'Sit-out nomination was not found.' }
  if (nomination.actionType !== 'sit_out_nominated') {
    return { ok: false, error: 'This sit-out nomination is no longer pending.' }
  }
  if (!nomination.targetUserId || nomination.targetUserId !== input.responderUserId) {
    return { ok: false, error: 'Only the nominated manager can respond to this sit-out.' }
  }

  const status: 'accepted' | 'declined' = input.accept ? 'accepted' : 'declined'
  const updated = await prisma.survivorCommissionerAction.update({
    where: { id: nomination.id },
    data: {
      actionType: status === 'accepted' ? 'sit_out_accepted' : 'sit_out_declined',
      description:
        status === 'accepted'
          ? 'Sit-out nomination accepted by nominated manager.'
          : 'Sit-out nomination declined by nominated manager.',
      previousState: toPrismaJson(nomination.newState),
      newState: {
        ...asObject(nomination.newState),
        status,
        respondedAt: new Date().toISOString(),
        respondedByUserId: input.responderUserId,
      } as object,
      wasConfirmed: status === 'accepted',
      executedAt: new Date(),
    },
  })

  await Promise.all([
    nomination.targetTribeId
      ? postToTribeChat(
          input.leagueId,
          nomination.targetTribeId,
          status === 'accepted'
            ? 'Sit-out accepted. This manager is now excluded from tribe scoring and mini-game eligibility for the week.'
            : 'Sit-out declined. No sit-out is applied for this nomination.',
          {
            type: 'sit_out_response',
            sitOutId: nomination.id,
            status,
            week: nomination.week ?? null,
          },
        )
      : Promise.resolve(),
    logSurvivorAuditEntry({
      leagueId: input.leagueId,
      week: nomination.week,
      category: 'sit_out',
      action: status === 'accepted' ? 'SIT_OUT_ACCEPTED' : 'SIT_OUT_DECLINED',
      actorUserId: input.responderUserId,
      targetUserId: input.responderUserId,
      targetTribeId: nomination.targetTribeId,
      relatedEntityId: nomination.id,
      relatedEntityType: 'survivor_commissioner_action',
      data: {
        status,
      },
      isVisibleToCommissioner: true,
      isVisibleToPublic: false,
    }),
  ])

  if (status === 'accepted' && nomination.week != null) {
    await maybeTriggerSurvivorTribeShuffleRecommendation(input.leagueId, nomination.week)
  }

  return { ok: true, status, sitOutId: updated.id }
}

export async function applySurvivorSitOutToScoring(
  leagueId: string,
  week: number,
): Promise<{ sitOutExcludedUserIds: string[]; tribeScoreBeforeSitOut: Record<string, number>; tribeScoreAfterSitOut: Record<string, number> }> {
  const accepted = await getAcceptedSitOutActions(leagueId, week)
  const sitOutExcludedUserIds = [...new Set(accepted.map((row) => row.targetUserId).filter((id): id is string => Boolean(id)))]
  if (sitOutExcludedUserIds.length === 0) {
    return {
      sitOutExcludedUserIds: [],
      tribeScoreBeforeSitOut: {},
      tribeScoreAfterSitOut: {},
    }
  }

  const weeklyRows = await prisma.survivorWeeklyScore.findMany({
    where: { leagueId, week },
    select: { id: true, userId: true, tribeId: true, finalScore: true, countedTowardTribeTotal: true },
  })

  const tribeScoreBeforeSitOut: Record<string, number> = {}
  for (const row of weeklyRows) {
    if (!row.tribeId || !row.countedTowardTribeTotal) continue
    tribeScoreBeforeSitOut[row.tribeId] = (tribeScoreBeforeSitOut[row.tribeId] ?? 0) + row.finalScore
  }

  const excludedRowIds = weeklyRows
    .filter((row) => sitOutExcludedUserIds.includes(row.userId) && row.countedTowardTribeTotal)
    .map((row) => row.id)

  if (excludedRowIds.length > 0) {
    await prisma.survivorWeeklyScore.updateMany({
      where: { id: { in: excludedRowIds } },
      data: { countedTowardTribeTotal: false },
    })
  }

  const refreshedRows = await prisma.survivorWeeklyScore.findMany({
    where: { leagueId, week },
    select: { tribeId: true, finalScore: true, countedTowardTribeTotal: true },
  })
  const tribeScoreAfterSitOut: Record<string, number> = {}
  for (const row of refreshedRows) {
    if (!row.tribeId || !row.countedTowardTribeTotal) continue
    tribeScoreAfterSitOut[row.tribeId] = (tribeScoreAfterSitOut[row.tribeId] ?? 0) + row.finalScore
  }

  await logSurvivorAuditEntry({
    leagueId,
    week,
    category: 'sit_out',
    action: 'SIT_OUT_APPLIED_TO_SCORING',
    data: {
      sitOutExcludedUserIds,
      tribeScoreBeforeSitOut,
      tribeScoreAfterSitOut,
    },
    isVisibleToCommissioner: true,
    isVisibleToPublic: false,
  })

  return {
    sitOutExcludedUserIds,
    tribeScoreBeforeSitOut,
    tribeScoreAfterSitOut,
  }
}

export async function applySurvivorSitOutToMiniGames(input: {
  leagueId: string
  week: number
  rosterId: string
}): Promise<SitOutMiniGameGuard> {
  const roster = await prisma.roster.findFirst({
    where: { id: input.rosterId, leagueId: input.leagueId },
    select: { platformUserId: true },
  })
  if (!roster?.platformUserId) {
    return { blocked: false, sitOutExcludedUserIds: [] }
  }

  const accepted = await getAcceptedSitOutActions(input.leagueId, input.week)
  const sitOutExcludedUserIds = [...new Set(accepted.map((row) => row.targetUserId).filter((id): id is string => Boolean(id)))]
  if (!sitOutExcludedUserIds.includes(roster.platformUserId)) {
    return { blocked: false, sitOutExcludedUserIds }
  }

  return {
    blocked: true,
    sitOutExcludedUserIds,
    reason: 'You are marked as sit-out this week and cannot participate in mini-games.',
  }
}

export async function maybeTriggerSurvivorTribeShuffleRecommendation(
  leagueId: string,
  week: number,
): Promise<{ triggered: boolean; reason: string }> {
  const [balance, config, existingRecommendation] = await Promise.all([
    getSurvivorTribeBalanceState(leagueId, week),
    getSurvivorConfig(leagueId),
    prisma.survivorCommissionerAction.findFirst({
      where: {
        leagueId,
        actionType: 'sit_out_shuffle_recommendation',
      },
      select: { id: true },
    }),
  ])

  if (!balance.shouldSuggestShuffle) {
    return { triggered: false, reason: 'No tribe is at or below 2 active members.' }
  }
  if (existingRecommendation) {
    return { triggered: false, reason: 'Shuffle recommendation has already been used this season.' }
  }

  if (config?.tribeShuffleEnabled && config.tribeShuffleImbalanceThreshold != null) {
    const spread = Math.max(0, balance.maxTribeSize - balance.minTribeSize)
    if (spread <= config.tribeShuffleImbalanceThreshold) {
      return {
        triggered: false,
        reason: 'Current tribe spread is within configured intentional reshuffle tolerance.',
      }
    }
  }

  const created = await prisma.survivorCommissionerAction.create({
    data: {
      leagueId,
      commissionerId: CHIMMY_HOST_USER_ID,
      week,
      actionType: 'sit_out_shuffle_recommendation',
      description: 'One-time recommendation: consider tribe shuffle due to low tribe size.',
      newState: {
        minTribeSize: balance.minTribeSize,
        maxTribeSize: balance.maxTribeSize,
        tribeSizes: balance.tribeSizes,
      } as object,
      wasConfirmed: true,
    },
  })

  await Promise.all([
    enqueueNotification(leagueId, 'tribe_shuffle_recommendation', {
      recipientRole: 'commissioner',
      title: '⚖️ Survivor shuffle recommended',
      body: 'A tribe has reached 2 active members. Review one-time shuffle recommendation.',
      deepLinkPath: `/league/${leagueId}/survivor/commissioner`,
      urgency: 'high',
      isSpoilerSafe: true,
    }),
    logSurvivorAuditEntry({
      leagueId,
      week,
      category: 'sit_out',
      action: 'SIT_OUT_SHUFFLE_RECOMMENDED',
      relatedEntityId: created.id,
      relatedEntityType: 'survivor_commissioner_action',
      data: {
        minTribeSize: balance.minTribeSize,
        maxTribeSize: balance.maxTribeSize,
        tribeSizes: balance.tribeSizes,
      },
      isVisibleToCommissioner: true,
      isVisibleToPublic: false,
    }),
  ])

  return { triggered: true, reason: 'Shuffle recommendation created.' }
}

export async function getSurvivorSitOutStateForWeek(leagueId: string, week: number): Promise<{
  pending: SurvivorSitOutAction[]
  accepted: SurvivorSitOutAction[]
  declined: SurvivorSitOutAction[]
}> {
  const rows = (await prisma.survivorCommissionerAction.findMany({
    where: {
      leagueId,
      week,
      actionType: { in: ['sit_out_nominated', 'sit_out_accepted', 'sit_out_declined'] },
    },
    orderBy: { executedAt: 'asc' },
  }))

  return {
    pending: rows.filter((row) => row.actionType === 'sit_out_nominated').map(toSitOutAction),
    accepted: rows.filter((row) => row.actionType === 'sit_out_accepted').map(toSitOutAction),
    declined: rows.filter((row) => row.actionType === 'sit_out_declined').map(toSitOutAction),
  }
}