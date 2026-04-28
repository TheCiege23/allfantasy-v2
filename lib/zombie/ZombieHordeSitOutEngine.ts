import { prisma } from '@/lib/prisma'
import { getRosterTeamMap, getRosterWeeklyScore } from './rosterTeamMap'
import { notifyCommissioner, notifyZombiePlayer } from './commissionerNotificationService'

type SitOutState = 'pending' | 'accepted' | 'declined'

export type ZombieHordeSitOutAction = {
  id: string
  leagueId: string
  week: number
  userId: string
  actionType: string
  rawMessage: string
  parsedAction: Record<string, unknown>
  createdAt: Date
  resolvedAt: Date | null
}

export type ZombieHordeBalanceState = {
  leagueId: string
  week: number
  survivorCount: number
  hordeCount: number
  shouldSuggestShuffle: boolean
  suggestionReason: string | null
}

export type ZombieHordeSitOutCandidate = {
  rosterId: string
  userId: string
  displayName: string
  status: string
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSitOutTargetFromCommand(rawMessage: string): string | null {
  const lower = rawMessage.trim()
  const patterns = [
    /@chimmy\s+horde\s+sit\s*out\s+(.+)/i,
    /@chimmy\s+sit\s*out\s+(.+)/i,
    /@chimmy\s+nominate\s+(.+)\s+to\s+sit(?:\s*out)?/i,
    /@chimmy\s+(.+)\s+sit\s*out/i,
  ]
  for (const pattern of patterns) {
    const m = lower.match(pattern)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

async function findZombieLeague(leagueId: string): Promise<{ id: string; season: number } | null> {
  const row = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    select: { id: true, season: true },
  })
  if (!row) return null
  return row
}

async function getSitOutRowsByWeek(leagueId: string, week: number): Promise<ZombieHordeSitOutAction[]> {
  const rows = await prisma.zombieChimmyAction.findMany({
    where: {
      leagueId,
      week,
      actionType: {
        in: ['horde_sit_out_nomination', 'horde_sit_out_accepted', 'horde_sit_out_declined'],
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map((row) => ({
    id: row.id,
    leagueId: row.leagueId,
    week: row.week,
    userId: row.userId,
    actionType: row.actionType,
    rawMessage: row.rawMessage,
    parsedAction: asObject(row.parsedAction),
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  }))
}

function readSitOutState(row: ZombieHordeSitOutAction): SitOutState {
  if (row.actionType === 'horde_sit_out_accepted') return 'accepted'
  if (row.actionType === 'horde_sit_out_declined') return 'declined'
  return 'pending'
}

function displayNameFromTeamRow(row: { fantasyTeamName: string | null; displayName: string | null; rosterId: string }): string {
  return row.fantasyTeamName?.trim() || row.displayName?.trim() || row.rosterId
}

async function resolveUserToRosterId(leagueId: string, userId: string): Promise<string | null> {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  return roster?.id ?? null
}

async function resolveTargetCandidateByCommand(
  leagueId: string,
  command: string,
  candidates: ZombieHordeSitOutCandidate[],
): Promise<ZombieHordeSitOutCandidate | null> {
  const targetText = parseSitOutTargetFromCommand(command)
  if (!targetText) return null
  const normalizedTarget = normalizeToken(targetText)
  if (!normalizedTarget) return null

  const direct = candidates.find((candidate) => normalizeToken(candidate.displayName) === normalizedTarget)
  if (direct) return direct

  const rosterRows = await prisma.roster.findMany({
    where: { leagueId, id: { in: candidates.map((candidate) => candidate.rosterId) } },
    select: { id: true, platformUserId: true },
  })
  const users = await prisma.appUser.findMany({
    where: {
      id: {
        in: rosterRows.map((row) => row.platformUserId).filter((id): id is string => Boolean(id)),
      },
    },
    select: { id: true, displayName: true, username: true },
  })
  const userById = new Map(users.map((user) => [user.id, user]))

  for (const candidate of candidates) {
    const roster = rosterRows.find((row) => row.id === candidate.rosterId)
    const user = roster?.platformUserId ? userById.get(roster.platformUserId) : null
    const aliases = [
      candidate.displayName,
      user?.displayName ?? '',
      user?.username ?? '',
      candidate.userId,
      candidate.rosterId,
    ]
    if (aliases.some((alias) => normalizeToken(alias) === normalizedTarget)) {
      return candidate
    }
  }

  return null
}

export async function getZombieHordeBalanceState(leagueId: string, week: number): Promise<ZombieHordeBalanceState> {
  const teams = await prisma.zombieLeagueTeam.findMany({
    where: { leagueId },
    select: { status: true },
  })
  const survivorCount = teams.filter((team) => {
    const status = (team.status ?? '').toLowerCase()
    return status.includes('survivor') || status.includes('revived')
  }).length
  const hordeCount = teams.filter((team) => {
    const status = (team.status ?? '').toLowerCase()
    return status.includes('zombie') || status.includes('whisperer')
  }).length

  const shouldSuggestShuffle = survivorCount <= 2 || hordeCount <= 2
  return {
    leagueId,
    week,
    survivorCount,
    hordeCount,
    shouldSuggestShuffle,
    suggestionReason: shouldSuggestShuffle
      ? 'At least one side has dropped to two or fewer active teams.'
      : null,
  }
}

export async function getEligibleZombieHordeSitOutCandidates(
  leagueId: string,
  week: number,
): Promise<ZombieHordeSitOutCandidate[]> {
  const [teams, rosters, previousWeekAccepted] = await Promise.all([
    prisma.zombieLeagueTeam.findMany({
      where: { leagueId },
      select: { rosterId: true, status: true, fantasyTeamName: true, displayName: true },
    }),
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
    prisma.zombieChimmyAction.findMany({
      where: {
        leagueId,
        week: Math.max(1, week - 1),
        actionType: 'horde_sit_out_accepted',
        isValid: true,
      },
      select: { userId: true },
    }),
  ])

  const rosterUserMap = new Map(
    rosters
      .filter((roster): roster is { id: string; platformUserId: string } => Boolean(roster.platformUserId))
      .map((roster) => [roster.id, roster.platformUserId]),
  )
  const previousUserIds = new Set(previousWeekAccepted.map((row) => row.userId))

  return teams
    .filter((team) => {
      const status = (team.status ?? '').toLowerCase()
      return status.includes('zombie') || status.includes('whisperer')
    })
    .map((team) => ({
      rosterId: team.rosterId,
      userId: rosterUserMap.get(team.rosterId) ?? '',
      displayName: displayNameFromTeamRow(team),
      status: team.status,
    }))
    .filter((candidate) => Boolean(candidate.userId) && !previousUserIds.has(candidate.userId))
}

export async function nominateZombieHordeSitOut(input: {
  leagueId: string
  week: number
  nominatorUserId: string
  rawCommand: string
}): Promise<
  | { ok: true; sitOutId: string; nominatedDisplayName: string; nominatedUserId: string }
  | { ok: false; error: string; eligibleCandidates?: ZombieHordeSitOutCandidate[] }
> {
  const { leagueId, week, nominatorUserId, rawCommand } = input
  const eligibleCandidates = await getEligibleZombieHordeSitOutCandidates(leagueId, week)
  const target = await resolveTargetCandidateByCommand(leagueId, rawCommand, eligibleCandidates)
  if (!target) {
    return {
      ok: false,
      error: 'Could not resolve a valid horde member for sit-out nomination.',
      eligibleCandidates,
    }
  }

  const nominatorRosterId = await resolveUserToRosterId(leagueId, nominatorUserId)
  if (!nominatorRosterId) {
    return { ok: false, error: 'Nominator roster not found for this league.', eligibleCandidates }
  }

  const nominatorTeam = await prisma.zombieLeagueTeam.findUnique({
    where: { leagueId_rosterId: { leagueId, rosterId: nominatorRosterId } },
    select: { status: true },
  })
  const nominatorStatus = (nominatorTeam?.status ?? '').toLowerCase()
  if (!nominatorStatus.includes('zombie') && !nominatorStatus.includes('whisperer')) {
    return { ok: false, error: 'Only horde members can nominate horde sit-outs.', eligibleCandidates }
  }

  const existingForWeek = await getSitOutRowsByWeek(leagueId, week)
  const targetAlreadyPending = existingForWeek.some(
    (row) => row.userId === target.userId && readSitOutState(row) === 'pending',
  )
  if (targetAlreadyPending) {
    return { ok: false, error: 'A pending horde sit-out nomination already exists for that manager.' }
  }
  const targetAlreadyAccepted = existingForWeek.some(
    (row) => row.userId === target.userId && readSitOutState(row) === 'accepted',
  )
  if (targetAlreadyAccepted) {
    return { ok: false, error: 'This horde manager is already locked as sit-out for this week.' }
  }

  const created = await prisma.zombieChimmyAction.create({
    data: {
      leagueId,
      userId: target.userId,
      week,
      actionType: 'horde_sit_out_nomination',
      rawMessage: rawCommand,
      parsedAction: {
        status: 'pending',
        nominatedUserId: target.userId,
        nominatedRosterId: target.rosterId,
        nominatedDisplayName: target.displayName,
        nominatedStatus: target.status,
        nominatedByUserId: nominatorUserId,
      } as object,
      isValid: true,
      privateResponse: `${target.displayName} has been nominated to sit out. Waiting for Yes/No response.`,
      publicResponse: `${target.displayName} was nominated to sit out. This becomes official only if they accept.`,
    },
  })

  await Promise.all([
    notifyZombiePlayer(target.userId, 'horde_sit_out_nomination', 'Horde sit-out nomination pending', {
      body: 'You were nominated to sit out this week. Confirm Yes/No in Zombie notifications.',
      severity: 'medium',
      pushSpoilerSafe: true,
      meta: {
        leagueId,
        week,
        sitOutId: created.id,
      },
    }),
    notifyCommissioner(
      leagueId,
      'horde_sit_out_nomination',
      'Horde sit-out nomination pending',
      `${target.displayName} has a pending sit-out nomination awaiting response.`,
      {
        urgency: 'high',
        relatedUserId: target.userId,
        relatedEventId: created.id,
        relatedEventType: 'zombie_chimmy_action',
        requiresAction: false,
        week,
      },
    ),
  ])

  return {
    ok: true,
    sitOutId: created.id,
    nominatedDisplayName: target.displayName,
    nominatedUserId: target.userId,
  }
}

export async function respondToZombieHordeSitOut(input: {
  leagueId: string
  sitOutId: string
  responderUserId: string
  accept: boolean
}): Promise<{ ok: true; status: SitOutState; sitOutId: string } | { ok: false; error: string }> {
  const row = await prisma.zombieChimmyAction.findFirst({
    where: {
      id: input.sitOutId,
      leagueId: input.leagueId,
      actionType: 'horde_sit_out_nomination',
    },
  })
  if (!row) return { ok: false, error: 'Horde sit-out nomination not found or already resolved.' }
  if (row.userId !== input.responderUserId) {
    return { ok: false, error: 'Only the nominated horde manager can respond to this sit-out.' }
  }

  const status: SitOutState = input.accept ? 'accepted' : 'declined'
  const updated = await prisma.zombieChimmyAction.update({
    where: { id: row.id },
    data: {
      actionType: status === 'accepted' ? 'horde_sit_out_accepted' : 'horde_sit_out_declined',
      parsedAction: {
        ...asObject(row.parsedAction),
        status,
        respondedByUserId: input.responderUserId,
        respondedAt: new Date().toISOString(),
      } as object,
      privateResponse:
        status === 'accepted'
          ? 'Sit-out accepted. You are excluded from horde scoring/challenge actions this week.'
          : 'Sit-out declined. A new nomination is required for this week.',
      resolvedAt: new Date(),
      isValid: true,
    },
  })

  await notifyCommissioner(
    input.leagueId,
    status === 'accepted' ? 'horde_sit_out_accepted' : 'horde_sit_out_declined',
    status === 'accepted' ? 'Horde sit-out accepted' : 'Horde sit-out declined',
    status === 'accepted'
      ? 'The nominated horde manager accepted the sit-out and is now locked out for the week.'
      : 'The nominated horde manager declined the sit-out. Horde must nominate someone else.',
    {
      urgency: status === 'accepted' ? 'high' : 'normal',
      relatedUserId: input.responderUserId,
      relatedEventId: row.id,
      relatedEventType: 'zombie_chimmy_action',
      requiresAction: status === 'declined',
      week: row.week,
    },
  )

  if (status === 'accepted') {
    await maybeTriggerZombieHordeShuffleRecommendation(input.leagueId, row.week)
  }

  return { ok: true, status, sitOutId: updated.id }
}

export async function applyZombieHordeSitOutToScoring(leagueId: string, week: number): Promise<{
  sitOutExcludedUserIds: string[]
  hordeScoreBeforeSitOut: number
  hordeScoreAfterSitOut: number
}> {
  const zombieLeague = await findZombieLeague(leagueId)
  if (!zombieLeague) {
    return { sitOutExcludedUserIds: [], hordeScoreBeforeSitOut: 0, hordeScoreAfterSitOut: 0 }
  }

  const acceptedRows = await prisma.zombieChimmyAction.findMany({
    where: {
      leagueId,
      week,
      actionType: 'horde_sit_out_accepted',
      isValid: true,
    },
    select: { userId: true },
  })
  const sitOutExcludedUserIds = [...new Set(acceptedRows.map((row) => row.userId).filter(Boolean))]
  if (sitOutExcludedUserIds.length === 0) {
    return { sitOutExcludedUserIds: [], hordeScoreBeforeSitOut: 0, hordeScoreAfterSitOut: 0 }
  }

  const [map, teams, rosters] = await Promise.all([
    getRosterTeamMap(leagueId),
    prisma.zombieLeagueTeam.findMany({
      where: { leagueId },
      select: { rosterId: true, status: true },
    }),
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
  ])

  const rosterToUser = new Map(
    rosters
      .filter((row): row is { id: string; platformUserId: string } => Boolean(row.platformUserId))
      .map((row) => [row.id, row.platformUserId]),
  )

  let hordeScoreBeforeSitOut = 0
  let hordeScoreAfterSitOut = 0
  for (const team of teams) {
    const status = (team.status ?? '').toLowerCase()
    if (!status.includes('zombie') && !status.includes('whisperer')) continue
    if (!map.rosterIdToTeamId.get(team.rosterId)) continue

    const score = await getRosterWeeklyScore(leagueId, team.rosterId, zombieLeague.season, week)
    hordeScoreBeforeSitOut += score

    const userId = rosterToUser.get(team.rosterId)
    if (!userId || !sitOutExcludedUserIds.includes(userId)) {
      hordeScoreAfterSitOut += score
    }
  }

  await prisma.zombieAuditEntry.create({
    data: {
      zombieLeagueId: zombieLeague.id,
      week,
      category: 'horde_sit_out',
      action: 'SCORING_EXCLUSION_APPLIED',
      description: 'Applied horde sit-out scoring exclusion for accepted nominations.',
      newState: {
        sitOutExcludedUserIds,
        hordeScoreBeforeSitOut,
        hordeScoreAfterSitOut,
      } as object,
      actorRole: 'system',
    },
  })

  return {
    sitOutExcludedUserIds,
    hordeScoreBeforeSitOut,
    hordeScoreAfterSitOut,
  }
}

export async function applyZombieHordeSitOutToChallenges(input: {
  leagueId: string
  week: number
  userId: string
}): Promise<{ blocked: boolean; sitOutExcludedUserIds: string[]; reason?: string }> {
  const acceptedRows = await prisma.zombieChimmyAction.findMany({
    where: {
      leagueId: input.leagueId,
      week: input.week,
      actionType: 'horde_sit_out_accepted',
      isValid: true,
    },
    select: { userId: true },
  })
  const sitOutExcludedUserIds = [...new Set(acceptedRows.map((row) => row.userId).filter(Boolean))]
  if (!sitOutExcludedUserIds.includes(input.userId)) {
    return { blocked: false, sitOutExcludedUserIds }
  }

  return {
    blocked: true,
    sitOutExcludedUserIds,
    reason: 'Sit-out accepted: challenge and horde action commands are disabled for this week.',
  }
}

export async function maybeTriggerZombieHordeShuffleRecommendation(
  leagueId: string,
  week: number,
): Promise<{ triggered: boolean; reason: string }> {
  const existing = await prisma.zombieChimmyAction.findFirst({
    where: { leagueId, actionType: 'horde_shuffle_recommendation' },
    select: { id: true },
  })
  if (existing) {
    return { triggered: false, reason: 'Horde shuffle recommendation already used this season.' }
  }

  const balance = await getZombieHordeBalanceState(leagueId, week)
  if (!balance.shouldSuggestShuffle) {
    return { triggered: false, reason: 'Current horde/survivor counts do not require shuffle recommendation.' }
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  if (!league?.userId) {
    return { triggered: false, reason: 'Commissioner account missing for recommendation dispatch.' }
  }

  await prisma.zombieChimmyAction.create({
    data: {
      leagueId,
      userId: league.userId,
      week,
      actionType: 'horde_shuffle_recommendation',
      rawMessage: 'system:horde_shuffle_recommendation',
      parsedAction: {
        survivorCount: balance.survivorCount,
        hordeCount: balance.hordeCount,
        reason: balance.suggestionReason,
      } as object,
      isValid: true,
      privateResponse: 'One-time horde shuffle recommendation created.',
    },
  })

  await notifyCommissioner(
    leagueId,
    'horde_shuffle_recommendation',
    'Horde shuffle recommendation',
    'One side dropped to 2 or fewer teams. Consider a one-time horde shuffle recommendation.',
    {
      urgency: 'high',
      requiresAction: true,
      week,
    },
  )

  return { triggered: true, reason: 'Horde shuffle recommendation created.' }
}

export async function getZombieHordeSitOutStateForWeek(
  leagueId: string,
  week: number,
  userId?: string,
): Promise<{
  pending: ZombieHordeSitOutAction[]
  accepted: ZombieHordeSitOutAction[]
  declined: ZombieHordeSitOutAction[]
  myPending: ZombieHordeSitOutAction | null
}> {
  const rows = await getSitOutRowsByWeek(leagueId, week)
  const pending = rows.filter((row) => readSitOutState(row) === 'pending')
  return {
    pending,
    accepted: rows.filter((row) => readSitOutState(row) === 'accepted'),
    declined: rows.filter((row) => readSitOutState(row) === 'declined'),
    myPending: userId ? pending.find((row) => row.userId === userId) ?? null : null,
  }
}