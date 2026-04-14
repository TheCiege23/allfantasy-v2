import type {
  AuditRepository,
  DomainEventRepository,
  IdentityRepository,
  LeagueRepository,
  LineupRepository,
  MembershipRepository,
  RepositoryBundle,
  RosterEntryRecord,
  RosterRepository,
  SettingsRepository,
  LineupSubmissionRecord,
} from '../../contracts/repositories'
import type { AuditEntry, DomainEventEntry, IdentityRecord, LeagueRecord, MembershipRecord, SettingsRecord } from '../memory-store'
import type { SqlExecutor } from './executor'

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private readonly db: SqlExecutor) {}

  async getById(userId: string): Promise<IdentityRecord | null> {
    const { rows } = await this.db.query<IdentityRecord>(
      'select user_id as "userId", email, display_name as "displayName", timezone, created_at as "createdAt", updated_at as "updatedAt" from af_user_profiles where user_id = $1 limit 1',
      [userId],
    )
    return rows[0] ?? null
  }

  async upsert(record: IdentityRecord): Promise<void> {
    await this.db.query(
      'insert into af_user_profiles (user_id, email, display_name, timezone, created_at, updated_at) values ($1,$2,$3,$4,$5,$6) on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name, timezone = excluded.timezone, updated_at = excluded.updated_at',
      [record.userId, record.email, record.displayName, record.timezone, record.createdAt, record.updatedAt],
    )
  }
}

export class PostgresLeagueRepository implements LeagueRepository {
  constructor(private readonly db: SqlExecutor) {}

  async getById(leagueId: string): Promise<LeagueRecord | null> {
    const { rows } = await this.db.query<LeagueRecord>(
      'select id as "leagueId", name, sport, season_year as season, status, created_by as "commissionerUserId", created_at as "createdAt", updated_at as "updatedAt" from af_leagues where id = $1::uuid limit 1',
      [leagueId],
    )
    return rows[0] ?? null
  }

  async upsert(record: LeagueRecord): Promise<void> {
    await this.db.query(
      "insert into af_leagues (id, name, sport, league_type, season_year, status, created_by, created_at, updated_at) values ($1::uuid,$2,$3,'redraft',$4,$5::af_league_status,$6::uuid,$7::timestamptz,$8::timestamptz) on conflict (id) do update set name = excluded.name, sport = excluded.sport, season_year = excluded.season_year, status = excluded.status, updated_at = excluded.updated_at",
      [record.leagueId, record.name, record.sport, record.season, record.status, record.commissionerUserId, record.createdAt, record.updatedAt],
    )
  }
}

export class PostgresMembershipRepository implements MembershipRepository {
  constructor(private readonly db: SqlExecutor) {}

  async getByLeagueAndUser(leagueId: string, userId: string): Promise<MembershipRecord | null> {
    const { rows } = await this.db.query<{ leagueId: string; userId: string; role: string; joinedAt: string }>(
      'select league_id as "leagueId", user_id as "userId", role, joined_at as "joinedAt" from af_league_members where league_id = $1::uuid and user_id = $2::uuid limit 1',
      [leagueId, userId],
    )
    const row = rows[0]
    if (!row) return null
    return { ...row, role: row.role as MembershipRecord['role'] }
  }

  async listByLeague(leagueId: string): Promise<MembershipRecord[]> {
    const { rows } = await this.db.query<{ leagueId: string; userId: string; role: string; joinedAt: string }>(
      'select league_id as "leagueId", user_id as "userId", role, joined_at as "joinedAt" from af_league_members where league_id = $1::uuid',
      [leagueId],
    )
    return rows.map((row) => ({ ...row, role: row.role as MembershipRecord['role'] }))
  }

  async upsert(row: MembershipRecord): Promise<void> {
    await this.db.query(
      'insert into af_league_members (id, league_id, user_id, role, invite_status, joined_at) values (gen_random_uuid(), $1::uuid, $2::uuid, $3::af_member_role, $4::af_invite_status, $5::timestamptz) on conflict (league_id, user_id) do update set role = excluded.role, joined_at = excluded.joined_at',
      [row.leagueId, row.userId, row.role, 'accepted', row.joinedAt],
    )
  }
}

export class PostgresSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqlExecutor) {}

  async getByLeagueId(leagueId: string): Promise<SettingsRecord | null> {
    const domains: Record<string, Record<string, unknown>> = {}
    const versions: Record<string, number> = {}

    const tables = [
      { domain: 'general', table: 'af_league_settings_general' },
      { domain: 'roster', table: 'af_league_settings_roster' },
      { domain: 'scoring', table: 'af_league_settings_scoring' },
      { domain: 'draft', table: 'af_league_settings_draft' },
      { domain: 'schedule', table: 'af_league_settings_schedule' },
      { domain: 'playoff', table: 'af_league_settings_playoff' },
      { domain: 'member', table: 'af_league_settings_member' },
      { domain: 'commissioner', table: 'af_league_settings_commissioner' },
    ]

    for (const item of tables) {
      const { rows } = await this.db.query<{ data: Record<string, unknown> }>(
        `select data from ${item.table} where league_id = $1::uuid limit 1`,
        [leagueId],
      )
      if (rows[0]) {
        domains[item.domain] = rows[0].data
      }
    }

    const { rows: versionRows } = await this.db.query<{ domain: string; version: number }>(
      'select domain, max(version) as version from af_settings_versions where league_id = $1::uuid group by domain',
      [leagueId],
    )
    for (const row of versionRows) {
      versions[row.domain] = row.version
    }

    if (!Object.keys(domains).length && !Object.keys(versions).length) {
      return null
    }

    return { leagueId, domains, versions }
  }

  async upsert(record: SettingsRecord): Promise<void> {
    const mapping: Array<{ domain: string; table: string }> = [
      { domain: 'general', table: 'af_league_settings_general' },
      { domain: 'roster', table: 'af_league_settings_roster' },
      { domain: 'scoring', table: 'af_league_settings_scoring' },
      { domain: 'draft', table: 'af_league_settings_draft' },
      { domain: 'schedule', table: 'af_league_settings_schedule' },
      { domain: 'playoff', table: 'af_league_settings_playoff' },
      { domain: 'member', table: 'af_league_settings_member' },
      { domain: 'commissioner', table: 'af_league_settings_commissioner' },
    ]

    for (const item of mapping) {
      const payload = record.domains[item.domain]
      if (!payload) continue
      await this.db.query(
        `insert into ${item.table} (league_id, data, updated_at) values ($1::uuid, $2::jsonb, now()) on conflict (league_id) do update set data = excluded.data, updated_at = excluded.updated_at`,
        [record.leagueId, payload],
      )
    }
  }
}

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly db: SqlExecutor) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.db.query(
      'insert into af_settings_audit_log (id, league_id, domain, action, actor_user_id, payload, created_at) values ($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::jsonb,$7::timestamptz)',
      [entry.id, entry.leagueId, entry.domain, entry.action, entry.actorUserId, entry.payload, entry.createdAt],
    )
  }
}

export class PostgresDomainEventRepository implements DomainEventRepository {
  constructor(private readonly db: SqlExecutor) {}

  async append(entry: DomainEventEntry): Promise<void> {
    await this.db.query(
      'insert into af_domain_events (id, aggregate_type, aggregate_id, event_type, payload, occurred_at) values ($1::uuid,$2,$3,$4,$5::jsonb,$6::timestamptz)',
      [entry.id, entry.aggregateType, entry.aggregateId, entry.eventType, entry.payload, entry.occurredAt],
    )
  }
}

export class PostgresRosterRepository implements RosterRepository {
  constructor(private readonly db: SqlExecutor) {}

  async listRoster(leagueId: string, teamId: string): Promise<RosterEntryRecord[]> {
    const { rows } = await this.db.query<RosterEntryRecord>(
      'select tr.id as "rosterId", tr.league_id as "leagueId", tr.team_id as "teamId", a.id as "playerId", re.slot_code as "slotCode", re.section, re.acquired_at as "updatedAt" from af_team_rosters tr join af_roster_entries re on re.roster_id = tr.id join af_assets a on a.id = re.asset_id where tr.league_id = $1::uuid and tr.team_id = $2::uuid',
      [leagueId, teamId],
    )
    return rows
  }

  async upsertRosterEntries(_entries: RosterEntryRecord[]): Promise<void> {
    return
  }
}

export class PostgresLineupRepository implements LineupRepository {
  constructor(private readonly db: SqlExecutor) {}

  private mapDomainEventToSubmission(
    row: {
      eventId: string
      occurredAt: string
      payload: Record<string, unknown>
    },
    leagueId: string,
    teamId: string,
    weekOrPeriod: number,
  ): LineupSubmissionRecord | null {
    const payload = row.payload ?? {}
    const entriesRaw = Array.isArray(payload.entries) ? payload.entries : []
    const entries = entriesRaw
      .map((entry) => {
        const item = entry as Record<string, unknown>
        const slotCode = typeof item.slotCode === 'string' ? item.slotCode : ''
        const playerId = typeof item.playerId === 'string' ? item.playerId : ''
        return { slotCode, playerId }
      })
      .filter((entry) => entry.slotCode.length > 0 && entry.playerId.length > 0)

    if (!entries.length) {
      return null
    }

    const submissionId =
      typeof payload.submissionId === 'string' && payload.submissionId.length > 0
        ? payload.submissionId
        : row.eventId
    const submittedBy =
      typeof payload.submittedBy === 'string' && payload.submittedBy.length > 0
        ? payload.submittedBy
        : ''
    const submittedAt =
      typeof payload.submittedAt === 'string' && payload.submittedAt.length > 0
        ? payload.submittedAt
        : row.occurredAt
    const idempotencyKey =
      typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : undefined
    const correlationId =
      typeof payload.correlationId === 'string' ? payload.correlationId : undefined
    const lineupVersion =
      typeof payload.lineupVersion === 'number'
        ? payload.lineupVersion
        : Number(payload.lineupVersion) || 0

    return {
      id: submissionId,
      leagueId,
      teamId,
      weekOrPeriod,
      submittedBy,
      submittedAt,
      entries,
      idempotencyKey,
      correlationId,
      eventId: row.eventId,
      lineupVersion,
    }
  }

  async saveSubmission(record: LineupSubmissionRecord): Promise<void> {
    for (const entry of record.entries) {
      await this.db.query(
        'insert into af_lineup_entries (id, league_id, team_id, week_or_period, slot_code, asset_id, updated_by, updated_at, source) values (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::uuid, $6::uuid, $7::timestamptz, $8) on conflict (league_id, team_id, week_or_period, slot_code) do update set asset_id = excluded.asset_id, updated_by = excluded.updated_by, updated_at = excluded.updated_at, source = excluded.source',
        [record.leagueId, record.teamId, record.weekOrPeriod, entry.slotCode, entry.playerId, record.submittedBy, record.submittedAt, 'manual'],
      )
    }
  }

  async getByIdempotency(_leagueId: string, _teamId: string, _weekOrPeriod: number, _idempotencyKey: string): Promise<LineupSubmissionRecord | null> {
    const aggregateId = `${_leagueId}:${_teamId}:${_weekOrPeriod}`
    const { rows } = await this.db.query<{
      eventId: string
      occurredAt: string
      payload: Record<string, unknown>
    }>(
      "select id as \"eventId\", occurred_at as \"occurredAt\", payload from af_domain_events where aggregate_type = 'roster' and event_type = 'RosterUpdated' and aggregate_id = $1 and payload->>'idempotencyKey' = $2 order by occurred_at desc limit 1",
      [aggregateId, _idempotencyKey],
    )

    const row = rows[0]
    if (!row) {
      return null
    }

    return this.mapDomainEventToSubmission(row, _leagueId, _teamId, _weekOrPeriod)
  }

  async getLatest(_leagueId: string, _teamId: string, _weekOrPeriod: number): Promise<LineupSubmissionRecord | null> {
    const aggregateId = `${_leagueId}:${_teamId}:${_weekOrPeriod}`
    const { rows } = await this.db.query<{
      eventId: string
      occurredAt: string
      payload: Record<string, unknown>
    }>(
      "select id as \"eventId\", occurred_at as \"occurredAt\", payload from af_domain_events where aggregate_type = 'roster' and event_type = 'RosterUpdated' and aggregate_id = $1 order by occurred_at desc limit 1",
      [aggregateId],
    )

    const row = rows[0]
    if (!row) {
      return null
    }

    return this.mapDomainEventToSubmission(row, _leagueId, _teamId, _weekOrPeriod)
  }
}

export function createPostgresRepositories(db: SqlExecutor): RepositoryBundle {
  return {
    identities: new PostgresIdentityRepository(db),
    leagues: new PostgresLeagueRepository(db),
    memberships: new PostgresMembershipRepository(db),
    settings: new PostgresSettingsRepository(db),
    audits: new PostgresAuditRepository(db),
    domainEvents: new PostgresDomainEventRepository(db),
    rosters: new PostgresRosterRepository(db),
    lineups: new PostgresLineupRepository(db),
  }
}
