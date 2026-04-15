import type { SettingsService } from '../../contracts/services'
import type { RequestContext } from '../../contracts/permissions'
import type { AuditRepository, DomainEventRepository, SettingsRepository } from '../../contracts/repositories'
import type { EventPublisher } from '../../core/event-bus'
import { newId } from '../../core/id'
import { ContractPermissionGuard } from '../../core/permission-guard'
import type { SettingsRecord } from '../../repositories/memory-store'

const SETTINGS_DOMAINS = new Set([
  'general',
  'roster',
  'scoring',
  'draft',
  'schedule',
  'playoff',
  'member',
  'commissioner',
])

export class SettingsServiceImpl implements SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly audits: AuditRepository,
    private readonly domainEvents: DomainEventRepository,
    private readonly guard: ContractPermissionGuard,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async getSettings(ctx: RequestContext, leagueId: string): Promise<Record<string, unknown>> {
    this.guard.requireLeagueMembership(ctx, leagueId)
    const state = await this.ensureState(leagueId)
    return {
      leagueId,
      domains: state.domains,
      versions: state.versions,
    }
  }

  async updateSettings(
    ctx: RequestContext,
    leagueId: string,
    domain: string,
    payload: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    this.guard.requireRole(ctx, 'commissioner')
    const normalized = domain.toLowerCase()
    if (!SETTINGS_DOMAINS.has(normalized)) {
      throw new Error('invalid_settings_domain')
    }

    const state = await this.ensureState(leagueId)
    const currentVersion = state.versions[normalized] ?? 0
    const nextVersion = currentVersion + 1

    state.domains[normalized] = payload
    state.versions[normalized] = nextVersion
    await this.settings.upsert(state)

    const now = new Date().toISOString()
    await this.audits.append({
      id: newId('aud'),
      leagueId,
      domain: normalized,
      action: 'settings_updated',
      actorUserId: ctx.userId,
      payload: {
        reason: reason ?? null,
        version: nextVersion,
      },
      createdAt: now,
    })

    const eventId = newId('evt')
    const event = {
      id: eventId,
      aggregateType: 'settings',
      aggregateId: `${leagueId}:${normalized}`,
      leagueId,
      eventType: 'SettingsUpdated',
      version: nextVersion,
      occurredAt: now,
      payload: {
        domain: normalized,
        version: nextVersion,
        reason: reason ?? null,
      },
      actorUserId: ctx.userId,
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
  }

  private async ensureState(leagueId: string): Promise<SettingsRecord> {
    const existing = await this.settings.getByLeagueId(leagueId)
    if (existing) {
      return existing
    }

    const fresh: SettingsRecord = {
      leagueId,
      domains: {},
      versions: {},
    }
    await this.settings.upsert(fresh)
    return fresh
  }
}
