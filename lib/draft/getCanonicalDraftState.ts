import { prisma } from '@/lib/prisma'
import { resolveNextOpenPickOverall } from '@/lib/live-draft-engine/draftPickEmpty'

export type CanonicalDraftStateStatus = 'scheduled' | 'live' | 'paused' | 'completed'
export type CanonicalDraftType = 'snake' | 'linear' | 'auction'

export type CanonicalDraftState = {
  leagueId: string
  draftId: string
  status: CanonicalDraftStateStatus
  currentPickNumber: number | null
  currentRound: number | null
  currentTeamId: string | null
  currentManagerId: string | null
  startedAt: string | null
  pausedAt: string | null
  resumedAt: string | null
  pickTimerSeconds: number | null
  currentPickStartedAt: string | null
  timerEndAt: string | null
  pausedRemainingSeconds: number | null
  draftType: CanonicalDraftType | null
  thirdRoundReversalEnabled: boolean
  timezone: string | null
  totalTeams: number
  totalRounds: number
  picksMade: number
  nextPick: {
    overall: number | null
    round: number | null
    slot: number | null
  }
}

type GetCanonicalDraftStateInput = {
  leagueId: string
  draftId?: string | null
}

type SlotOrderEntry = {
  slot: number
  rosterId: string
}

function normalizeDate(value: Date | null | undefined): string | null {
  if (!(value instanceof Date)) return null
  const time = value.getTime()
  if (!Number.isFinite(time)) return null
  return value.toISOString()
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function normalizePositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.trunc(value)
  if (rounded <= 0) return null
  return rounded
}

function safePickCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  const rounded = Math.trunc(value)
  return rounded > 0 ? rounded : 0
}

function normalizeStatus(value: string | null | undefined): CanonicalDraftStateStatus {
  const status = String(value ?? '').trim().toLowerCase()
  if (status === 'in_progress' || status === 'active' || status === 'live') return 'live'
  if (status === 'paused') return 'paused'
  if (status === 'completed' || status === 'complete' || status === 'post_draft') return 'completed'
  return 'scheduled'
}

function normalizeDraftType(value: string | null | undefined): CanonicalDraftType | null {
  const draftType = String(value ?? '').trim().toLowerCase()
  if (draftType === 'snake' || draftType === 'linear' || draftType === 'auction') return draftType
  return null
}

function parseSlotOrder(value: unknown): SlotOrderEntry[] {
  if (!Array.isArray(value)) return []

  const parsed: SlotOrderEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const slot = normalizePositiveInt(row.slot)
    const rosterId = typeof row.rosterId === 'string' && row.rosterId.trim().length > 0 ? row.rosterId.trim() : null
    if (!slot || !rosterId) continue
    parsed.push({ slot, rosterId })
  }
  return parsed
}

function deriveSnakeSlot(round: number, offset: number, teamCount: number, thirdRoundReversal: boolean): number {
  if (!thirdRoundReversal) {
    return round % 2 === 1 ? offset + 1 : teamCount - offset
  }

  // 3RR pattern: R1 asc, R2 desc, R3 desc, R4 asc, then alternate.
  if (round === 1) return offset + 1
  if (round === 2 || round === 3) return teamCount - offset
  return round % 2 === 0 ? offset + 1 : teamCount - offset
}

function deriveSlotFromOverall(input: {
  overall: number
  round: number | null
  teamCount: number
  draftType: CanonicalDraftType | null
  thirdRoundReversal: boolean
}): number | null {
  const overall = normalizePositiveInt(input.overall)
  const teamCount = normalizePositiveInt(input.teamCount)
  if (!overall || !teamCount) return null

  const round =
    normalizePositiveInt(input.round) ??
    Math.floor((overall - 1) / teamCount) + 1
  const offset = (overall - 1) % teamCount

  if (input.draftType === 'linear') return offset + 1
  if (input.draftType === 'snake') {
    return deriveSnakeSlot(round, offset, teamCount, input.thirdRoundReversal)
  }

  // Auction drafts do not have deterministic snake/linear slot math.
  return null
}

function deriveCurrentPickStartedAt(timerEndAt: Date | null, pickTimerSeconds: number | null): string | null {
  if (!(timerEndAt instanceof Date)) return null
  if (pickTimerSeconds == null || !Number.isFinite(pickTimerSeconds) || pickTimerSeconds <= 0) return null

  const startedAtMs = timerEndAt.getTime() - Math.round(pickTimerSeconds * 1000)
  if (!Number.isFinite(startedAtMs)) return null
  const startedAt = new Date(startedAtMs)
  if (!Number.isFinite(startedAt.getTime())) return null
  return startedAt.toISOString()
}

export async function getCanonicalDraftState(
  input: GetCanonicalDraftStateInput,
): Promise<CanonicalDraftState | null> {
  const leagueId = String(input.leagueId ?? '').trim()
  if (!leagueId) return null

  const draftId = String(input.draftId ?? '').trim()

  const session = await prisma.draftSession.findFirst({
    where: draftId
      ? { id: draftId, leagueId }
      : { leagueId },
    select: {
      id: true,
      leagueId: true,
      status: true,
      draftType: true,
      rounds: true,
      teamCount: true,
      thirdRoundReversal: true,
      timerSeconds: true,
      timerEndAt: true,
      pausedRemainingSeconds: true,
      slotOrder: true,
      startedAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!session) return null

  const [pickRows, leagueSettings] = await Promise.all([
    prisma.draftPick.findMany({
      where: { sessionId: session.id },
      select: {
        overall: true,
        playerName: true,
        position: true,
        pickMetadata: true,
        round: true,
        slot: true,
        rosterId: true,
      },
      orderBy: { overall: 'asc' },
    }),
    prisma.leagueSettings.findUnique({
      where: { leagueId },
      select: { timezone: true },
    }),
  ])

  const status = normalizeStatus(session.status)
  const picksMade = safePickCount(pickRows.length)
  const totalTeams = normalizePositiveInt(session.teamCount) ?? 0
  const totalRounds = normalizePositiveInt(session.rounds) ?? 0
  const totalPicks = totalTeams > 0 && totalRounds > 0 ? totalTeams * totalRounds : 0
  const draftType = normalizeDraftType(session.draftType)

  const currentPickNumber =
    status === 'completed'
      ? null
      : resolveNextOpenPickOverall(
          pickRows.map((pick) => ({
            overall: pick.overall,
            playerName: pick.playerName,
            position: pick.position,
            pickMetadata: pick.pickMetadata,
          })),
          totalPicks,
        )

  const currentRound =
    currentPickNumber == null
      ? null
      : totalTeams > 0
        ? Math.floor((currentPickNumber - 1) / totalTeams) + 1
        : null

  const nextPickSlot =
    currentPickNumber == null
      ? null
      : deriveSlotFromOverall({
          overall: currentPickNumber,
          round: currentRound,
          teamCount: totalTeams,
          draftType,
          thirdRoundReversal: Boolean(session.thirdRoundReversal),
        })

  const slotOrder = parseSlotOrder(session.slotOrder)
  const currentTeamId =
    nextPickSlot == null
      ? null
      : slotOrder.find((entry) => entry.slot === nextPickSlot)?.rosterId ?? null

  const pickTimerSeconds = normalizeNullableNumber(session.timerSeconds)

  return {
    leagueId: session.leagueId,
    draftId: session.id,
    status,
    currentPickNumber,
    currentRound,
    currentTeamId,
    // Not directly schema-backed on DraftSession without an explicit mapping table.
    currentManagerId: null,
    startedAt: normalizeDate(session.startedAt),
    // No dedicated DraftSession pausedAt/resumedAt columns exist in schema.
    pausedAt: null,
    resumedAt: null,
    pickTimerSeconds,
    currentPickStartedAt: deriveCurrentPickStartedAt(session.timerEndAt, pickTimerSeconds),
    timerEndAt: normalizeDate(session.timerEndAt),
    pausedRemainingSeconds: normalizeNullableNumber(session.pausedRemainingSeconds),
    draftType,
    thirdRoundReversalEnabled: Boolean(session.thirdRoundReversal),
    timezone: typeof leagueSettings?.timezone === 'string' ? leagueSettings.timezone : null,
    totalTeams,
    totalRounds,
    picksMade,
    nextPick: {
      overall: currentPickNumber,
      round: currentRound,
      slot: nextPickSlot,
    },
  }
}
