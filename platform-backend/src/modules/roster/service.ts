import type { RosterService } from '../../contracts/services'
import type { RequestContext } from '../../contracts/permissions'
import type { DomainEventRepository, LineupRepository, MembershipRepository, RosterRepository } from '../../contracts/repositories'
import type { EventPublisher } from '../../core/event-bus'
import { newId } from '../../core/id'
import { ContractPermissionGuard } from '../../core/permission-guard'
import type { LineupSubmissionRecord } from '../../repositories/memory-store'

interface LineupEntryInput {
  slotCode: string
  playerId: string
}

interface SubmitLineupPayload {
  entries: LineupEntryInput[]
  idempotencyKey?: string
  correlationId?: string
}

export interface LineupSubmissionReceipt {
  submissionId: string
  eventId: string
  lineupVersion: number
  idempotencyKey?: string
  correlationId?: string
}

function parseLineupPayload(payload: Record<string, unknown>): SubmitLineupPayload {
  const entriesRaw = Array.isArray(payload.entries) ? payload.entries : []
  const entries = entriesRaw
    .map((row) => ({
      slotCode: typeof (row as Record<string, unknown>).slotCode === 'string' ? String((row as Record<string, unknown>).slotCode).trim() : '',
      playerId: typeof (row as Record<string, unknown>).playerId === 'string' ? String((row as Record<string, unknown>).playerId).trim() : '',
    }))
    .filter((row) => row.slotCode && row.playerId)

  if (!entries.length) {
    throw new Error('invalid_lineup_entries')
  }

  const idempotencyKey = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey.trim() : undefined
  const correlationId = typeof payload.correlationId === 'string' ? payload.correlationId.trim() : undefined

  return { entries, idempotencyKey, correlationId }
}

function validateUniqueSlots(entries: LineupEntryInput[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    const key = entry.slotCode.toUpperCase()
    if (seen.has(key)) {
      throw new Error('duplicate_lineup_slot')
    }
    seen.add(key)
  }
}

export class RosterServiceImpl implements RosterService {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly rosters: RosterRepository,
    private readonly lineups: LineupRepository,
    private readonly domainEvents: DomainEventRepository,
    private readonly guard: ContractPermissionGuard,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async getRoster(ctx: RequestContext, leagueId: string, teamId: string): Promise<Record<string, unknown>> {
    this.guard.requireLeagueMembership(ctx, leagueId)
    const currentPeriod = 1
    const entries = await this.rosters.listRoster(leagueId, teamId)
    const latestSubmission = await this.lineups.getLatest(leagueId, teamId, currentPeriod)

    return {
      leagueId,
      teamId,
      currentPeriod,
      entries,
      latestSubmission,
    }
  }

  async submitLineup(
    ctx: RequestContext,
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
    lineup: Record<string, unknown>,
  ): Promise<void> {
    await this.submitLineupWithReceipt(ctx, leagueId, teamId, weekOrPeriod, lineup)
  }

  async submitLineupWithReceipt(
    ctx: RequestContext,
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
    lineup: Record<string, unknown>,
  ): Promise<LineupSubmissionReceipt> {
    this.guard.requireLeagueMembership(ctx, leagueId)

    const membership = await this.memberships.getByLeagueAndUser(leagueId, ctx.userId)
    if (!membership) {
      throw new Error('membership_required')
    }

    if (membership.role === 'viewer') {
      throw new Error('role_required:member')
    }

    const payload = parseLineupPayload(lineup)
    validateUniqueSlots(payload.entries)

    if (payload.idempotencyKey) {
      const existing = await this.lineups.getByIdempotency(
        leagueId,
        teamId,
        weekOrPeriod,
        payload.idempotencyKey,
      )
      if (existing) {
        return {
          submissionId: existing.id,
          eventId: existing.eventId ?? '',
          lineupVersion: existing.lineupVersion ?? 0,
          idempotencyKey: payload.idempotencyKey,
          correlationId: payload.correlationId,
        }
      }
    }

    const now = new Date().toISOString()
    const submission: LineupSubmissionRecord = {
      id: newId('lnp'),
      leagueId,
      teamId,
      weekOrPeriod,
      submittedBy: ctx.userId,
      submittedAt: now,
      entries: payload.entries,
      idempotencyKey: payload.idempotencyKey,
      correlationId: payload.correlationId,
      lineupVersion: 1,
    }

    const latest = await this.lineups.getLatest(leagueId, teamId, weekOrPeriod)
    const lineupVersion = (latest?.lineupVersion ?? 0) + 1
    submission.lineupVersion = lineupVersion

    const eventId = newId('evt')
    submission.eventId = eventId
    await this.lineups.saveSubmission(submission)

    const event = {
      id: eventId,
      aggregateType: 'roster',
      aggregateId: `${leagueId}:${teamId}:${weekOrPeriod}`,
      leagueId,
      eventType: 'RosterUpdated',
      version: lineupVersion,
      occurredAt: now,
      payload: {
        teamId,
        weekOrPeriod,
        submissionId: submission.id,
        submittedBy: ctx.userId,
        submittedAt: now,
        lineupVersion,
        idempotencyKey: payload.idempotencyKey,
        correlationId: payload.correlationId,
        entries: payload.entries,
      },
      actorUserId: ctx.userId,
      correlationId: payload.correlationId,
    } as const

    await this.domainEvents.append({
      id: eventId,
      leagueId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      occurredAt: event.occurredAt,
    })
    await this.eventPublisher.publish(event)

    return {
      submissionId: submission.id,
      eventId,
      lineupVersion,
      idempotencyKey: payload.idempotencyKey,
      correlationId: payload.correlationId,
    }
  }
}
