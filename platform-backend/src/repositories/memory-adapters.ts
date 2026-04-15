import type {
  AuditRepository,
  DomainEventRepository,
  IdentityRepository,
  LeagueRepository,
  LineupRepository,
  MembershipRepository,
  RepositoryBundle,
  RosterRepository,
  RosterEntryRecord,
  SettingsRepository,
  LineupSubmissionRecord,
} from '../contracts/repositories'
import { MemoryStore, type AuditEntry, type DomainEventEntry, type IdentityRecord, type LeagueRecord, type MembershipRecord, type SettingsRecord } from './memory-store'

export class MemoryIdentityRepository implements IdentityRepository {
  constructor(private readonly store: MemoryStore) {}

  async getById(userId: string): Promise<IdentityRecord | null> {
    return this.store.identities.get(userId) ?? null
  }

  async upsert(record: IdentityRecord): Promise<void> {
    this.store.identities.set(record.userId, record)
  }
}

export class MemoryLeagueRepository implements LeagueRepository {
  constructor(private readonly store: MemoryStore) {}

  async getById(leagueId: string): Promise<LeagueRecord | null> {
    return this.store.leagues.get(leagueId) ?? null
  }

  async upsert(record: LeagueRecord): Promise<void> {
    this.store.leagues.set(record.leagueId, record)
  }
}

export class MemoryMembershipRepository implements MembershipRepository {
  constructor(private readonly store: MemoryStore) {}

  async getByLeagueAndUser(leagueId: string, userId: string): Promise<MembershipRecord | null> {
    return this.store.getMembership(leagueId, userId) ?? null
  }

  async listByLeague(leagueId: string): Promise<MembershipRecord[]> {
    return this.store.listMemberships(leagueId)
  }

  async upsert(row: MembershipRecord): Promise<void> {
    this.store.upsertMembership(row)
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  constructor(private readonly store: MemoryStore) {}

  async getByLeagueId(leagueId: string): Promise<SettingsRecord | null> {
    return this.store.settings.get(leagueId) ?? null
  }

  async upsert(record: SettingsRecord): Promise<void> {
    this.store.settings.set(record.leagueId, record)
  }
}

export class MemoryAuditRepository implements AuditRepository {
  constructor(private readonly store: MemoryStore) {}

  async append(entry: AuditEntry): Promise<void> {
    this.store.audits.push(entry)
  }
}

export class MemoryDomainEventRepository implements DomainEventRepository {
  constructor(private readonly store: MemoryStore) {}

  async append(entry: DomainEventEntry): Promise<void> {
    this.store.events.push(entry)
  }
}

export class MemoryRosterRepository implements RosterRepository {
  constructor(private readonly store: MemoryStore) {}

  async listRoster(leagueId: string, teamId: string): Promise<RosterEntryRecord[]> {
    return this.store.listRosterEntries(leagueId, teamId)
  }

  async upsertRosterEntries(entries: RosterEntryRecord[]): Promise<void> {
    this.store.upsertRosterEntries(entries)
  }
}

export class MemoryLineupRepository implements LineupRepository {
  constructor(private readonly store: MemoryStore) {}

  async saveSubmission(record: LineupSubmissionRecord): Promise<void> {
    this.store.saveLineupSubmission(record)
  }

  async getByIdempotency(
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
    idempotencyKey: string,
  ): Promise<LineupSubmissionRecord | null> {
    return this.store.findLineupByIdempotency(leagueId, teamId, weekOrPeriod, idempotencyKey)
  }

  async getLatest(leagueId: string, teamId: string, weekOrPeriod: number): Promise<LineupSubmissionRecord | null> {
    return this.store.getLatestLineupSubmission(leagueId, teamId, weekOrPeriod)
  }
}

export function createMemoryRepositories(store: MemoryStore): RepositoryBundle {
  return {
    identities: new MemoryIdentityRepository(store),
    leagues: new MemoryLeagueRepository(store),
    memberships: new MemoryMembershipRepository(store),
    settings: new MemorySettingsRepository(store),
    audits: new MemoryAuditRepository(store),
    domainEvents: new MemoryDomainEventRepository(store),
    rosters: new MemoryRosterRepository(store),
    lineups: new MemoryLineupRepository(store),
  }
}
