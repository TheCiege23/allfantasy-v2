/**
 * G15.1 — Event Foundation: outbox stores (transactional outbox pattern).
 *
 * `enqueue` writes BOTH the durable DomainEvent row and its EventOutbox dispatch
 * row. When a caller passes its active transaction via `opts.tx`, both rows commit
 * ATOMICALLY with the business write — so an event can never exist without its
 * state change, nor a state change without its event (no dual-write hazard).
 *
 * Delivery is intentionally NOT done here — the OutboxRelay (./outboxRelay) reads
 * pending rows and publishes to the bus. This decouples persistence from transport
 * and is what makes horizontal scaling possible without a Redis dependency today.
 */
import type { DomainEvent, EventActor, EventPeriod, EventSubjectRef, IOutboxStore, PersistOptions } from './types'

// ── Row <-> DomainEvent mapping ──────────────────────────────────────────────

interface DomainEventRow {
  eventId: string
  type: string
  schemaVersion: number
  occurredAt: Date
  recordedAt: Date
  sport: string | null
  leagueConcept: string | null
  tenantId: string
  leagueId: string | null
  seasonId: string | null
  actorType: string
  actorId: string | null
  source: string
  correlationId: string | null
  causationId: string | null
  idempotencyKey: string
  payload: unknown
  metadata: unknown
  period: unknown
  subjects: unknown
}

function toRow(event: DomainEvent): Omit<DomainEventRow, 'recordedAt'> & { recordedAt?: Date } {
  return {
    eventId: event.eventId,
    type: event.type,
    schemaVersion: event.schemaVersion,
    occurredAt: new Date(event.occurredAt),
    sport: event.sport,
    leagueConcept: event.leagueConcept,
    tenantId: event.tenantId,
    leagueId: event.leagueId,
    seasonId: event.seasonId,
    actorType: event.actor.type,
    actorId: event.actor.id ?? null,
    source: event.metadata.source,
    correlationId: event.metadata.correlationId ?? null,
    causationId: event.metadata.causationId ?? null,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    metadata: event.metadata,
    period: event.period,
    subjects: event.subjects,
  }
}

export function rowToDomainEvent(row: DomainEventRow): DomainEvent {
  return Object.freeze({
    eventId: row.eventId,
    type: row.type,
    schemaVersion: row.schemaVersion,
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    sport: row.sport,
    leagueConcept: row.leagueConcept,
    tenantId: row.tenantId,
    leagueId: row.leagueId,
    seasonId: row.seasonId,
    actor: { type: row.actorType as EventActor['type'], id: row.actorId },
    period: (row.period as EventPeriod | null) ?? null,
    subjects: (row.subjects as EventSubjectRef[]) ?? [],
    payload: (row.payload as Record<string, unknown>) ?? {},
    metadata: { source: row.source, ...((row.metadata as Record<string, unknown>) ?? {}) } as DomainEvent['metadata'],
    idempotencyKey: row.idempotencyKey,
  })
}

// ── Prisma-backed store (production) ─────────────────────────────────────────

/** Minimal shape of the Prisma delegates this store needs (keeps it loosely coupled). */
export interface PrismaLike {
  domainEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
    findMany(args: Record<string, unknown>): Promise<DomainEventRow[]>
  }
  eventOutbox: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
    findMany(args: Record<string, unknown>): Promise<{ eventId: string }[]>
    update(args: Record<string, unknown>): Promise<unknown>
  }
}

export class PrismaOutboxStore implements IOutboxStore {
  /**
   * @param client the base Prisma client (used for relay reads/marks).
   *   `enqueue` prefers `opts.tx` so writes join the caller's transaction.
   */
  constructor(private readonly client: PrismaLike) {}

  private db(opts?: PersistOptions): PrismaLike {
    return (opts?.tx as PrismaLike | undefined) ?? this.client
  }

  async enqueue(event: DomainEvent, opts?: PersistOptions): Promise<void> {
    const db = this.db(opts)
    await db.domainEvent.create({ data: toRow(event) as Record<string, unknown> })
    await db.eventOutbox.create({
      data: { eventId: event.eventId, status: 'pending', attempts: 0, availableAt: new Date() },
    })
  }

  async fetchPending(limit: number, now: Date = new Date()): Promise<DomainEvent[]> {
    const pending = await this.client.eventOutbox.findMany({
      where: { status: 'pending', availableAt: { lte: now } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
    if (pending.length === 0) return []
    const ids = pending.map((p) => p.eventId)
    const rows = await this.client.domainEvent.findMany({ where: { eventId: { in: ids } } })
    const byId = new Map(rows.map((r) => [r.eventId, r]))
    // Preserve pending (createdAt asc) order.
    return ids.map((id) => byId.get(id)).filter((r): r is DomainEventRow => Boolean(r)).map(rowToDomainEvent)
  }

  async markDispatched(eventId: string): Promise<void> {
    await this.client.eventOutbox.update({
      where: { eventId },
      data: { status: 'dispatched', dispatchedAt: new Date() },
    })
  }

  async markFailed(eventId: string, error: string, nextAvailableAt: Date): Promise<void> {
    await this.client.eventOutbox.update({
      where: { eventId },
      data: { attempts: { increment: 1 }, lastError: error.slice(0, 1000), availableAt: nextAvailableAt },
    })
  }
}

// ── In-memory store (tests / local) ──────────────────────────────────────────

export class InMemoryOutboxStore implements IOutboxStore {
  readonly events = new Map<string, DomainEvent>()
  readonly outbox = new Map<string, { status: 'pending' | 'dispatched'; attempts: number; availableAt: Date; createdAt: Date; lastError?: string; dispatchedAt?: Date }>()

  async enqueue(event: DomainEvent): Promise<void> {
    if (this.events.has(event.idempotencyKey)) {
      throw new Error(`duplicate idempotencyKey: ${event.idempotencyKey}`)
    }
    this.events.set(event.idempotencyKey, event)
    this.outbox.set(event.eventId, { status: 'pending', attempts: 0, availableAt: new Date(), createdAt: new Date() })
  }

  async fetchPending(limit: number, now: Date = new Date()): Promise<DomainEvent[]> {
    const ids = [...this.outbox.entries()]
      .filter(([, o]) => o.status === 'pending' && o.availableAt <= now)
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
      .slice(0, limit)
      .map(([id]) => id)
    const byEventId = new Map([...this.events.values()].map((e) => [e.eventId, e]))
    return ids.map((id) => byEventId.get(id)).filter((e): e is DomainEvent => Boolean(e))
  }

  async markDispatched(eventId: string): Promise<void> {
    const o = this.outbox.get(eventId)
    if (o) {
      o.status = 'dispatched'
      o.dispatchedAt = new Date()
    }
  }

  async markFailed(eventId: string, error: string, nextAvailableAt: Date): Promise<void> {
    const o = this.outbox.get(eventId)
    if (o) {
      o.attempts += 1
      o.lastError = error
      o.availableAt = nextAvailableAt
    }
  }
}
