import type { LeagueService } from '../../contracts/services'
import type { RequestContext } from '../../contracts/permissions'
import type { DomainEventRepository, LeagueRepository, MembershipRepository } from '../../contracts/repositories'
import type { EventPublisher } from '../../core/event-bus'
import { newId } from '../../core/id'
import { ContractPermissionGuard } from '../../core/permission-guard'
import type { LeagueRecord } from '../../repositories/memory-store'

interface CreateLeagueInput {
  name: string
  sport: string
  season: number
}

function parseCreateLeagueInput(input: Record<string, unknown>): CreateLeagueInput {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const sport = typeof input.sport === 'string' ? input.sport.trim() : ''
  const season = typeof input.season === 'number' ? input.season : Number(input.season)

  if (!name) {
    throw new Error('invalid_league_name')
  }
  if (!sport) {
    throw new Error('invalid_league_sport')
  }
  if (!Number.isFinite(season)) {
    throw new Error('invalid_league_season')
  }

  return {
    name,
    sport,
    season: Math.trunc(season),
  }
}

export class LeagueServiceImpl implements LeagueService {
  constructor(
    private readonly leagues: LeagueRepository,
    private readonly memberships: MembershipRepository,
    private readonly domainEvents: DomainEventRepository,
    private readonly guard: ContractPermissionGuard,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createLeague(ctx: RequestContext, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.guard.requireAuth(ctx)
    const payload = parseCreateLeagueInput(input)
    const now = new Date().toISOString()
    const leagueId = newId('lga')
    const record: LeagueRecord = {
      leagueId,
      name: payload.name,
      sport: String(payload.sport).toUpperCase(),
      season: Number(payload.season),
      status: 'pre_draft',
      commissionerUserId: ctx.userId,
      createdAt: now,
      updatedAt: now,
    }

    await this.leagues.upsert(record)
    await this.memberships.upsert({
      leagueId: record.leagueId,
      userId: ctx.userId,
      role: 'commissioner',
      joinedAt: now,
    })

    const eventId = newId('evt')
    const event = {
      id: eventId,
      aggregateType: 'league',
      aggregateId: record.leagueId,
      leagueId: record.leagueId,
      eventType: 'LeagueCreated',
      version: 1,
      occurredAt: now,
      payload: {
        name: record.name,
        sport: record.sport,
        season: record.season,
      },
      actorUserId: ctx.userId,
    } as const

    await this.domainEvents.append({
      id: eventId,
      leagueId: record.leagueId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      occurredAt: event.occurredAt,
    })
    await this.eventPublisher.publish(event)

    return { ...record }
  }

  async updateLeagueState(ctx: RequestContext, leagueId: string, phase: string): Promise<void> {
    this.guard.requireRole(ctx, 'commissioner')
    const row = await this.leagues.getById(leagueId)
    if (!row) {
      throw new Error('league_not_found')
    }

    row.status = phase
    row.updatedAt = new Date().toISOString()
    await this.leagues.upsert(row)
  }

  async getLeague(ctx: RequestContext, leagueId: string): Promise<LeagueRecord> {
    this.guard.requireLeagueMembership(ctx, leagueId)
    const row = await this.leagues.getById(leagueId)
    if (!row) {
      throw new Error('league_not_found')
    }
    return row
  }
}
