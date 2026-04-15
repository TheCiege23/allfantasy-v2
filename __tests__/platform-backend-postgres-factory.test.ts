import { describe, expect, test } from 'vitest'
import { createPostgresBackendApp } from '../platform-backend/src/app-postgres'
import { buildHttpRequest } from '../platform-backend/src/http/request-factory'
import type { SqlExecutor } from '../platform-backend/src/repositories/postgres/executor'

type LeagueRow = {
  leagueId: string
  name: string
  sport: string
  season: number
  status: string
  commissionerUserId: string
  createdAt: string
  updatedAt: string
}

type MembershipRow = {
  leagueId: string
  userId: string
  role: string
  joinedAt: string
}

type RosterEntryRow = {
  rosterId: string
  leagueId: string
  teamId: string
  playerId: string
  slotCode: string
  section: string
  updatedAt: string
}

class FakeSqlExecutor implements SqlExecutor {
  readonly leagues = new Map<string, LeagueRow>()
  readonly memberships = new Map<string, MembershipRow[]>()
  readonly rosters = new Map<string, RosterEntryRow[]>()
  readonly domainEvents: Array<{
    id: string
    eventType: string
    aggregateId: string
    occurredAt: string
    payload: Record<string, unknown>
  }> = []
  readonly settingsGeneral = new Map<string, Record<string, unknown>>()

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const normalized = sql.toLowerCase().trim()

    if (normalized.startsWith('insert into af_leagues')) {
      const [leagueId, name, sport, season, status, commissionerUserId, createdAt, updatedAt] = params as [
        string,
        string,
        string,
        number,
        string,
        string,
        string,
        string,
      ]
      this.leagues.set(leagueId, {
        leagueId,
        name,
        sport,
        season,
        status,
        commissionerUserId,
        createdAt,
        updatedAt,
      })
      return { rows: [] as T[] }
    }

    if (normalized.startsWith('select id as "leagueid"')) {
      const leagueId = String(params[0])
      const row = this.leagues.get(leagueId)
      return { rows: (row ? [row] : []) as T[] }
    }

    if (normalized.startsWith('insert into af_league_members')) {
      const [leagueId, userId, role, _invite, joinedAt] = params as [string, string, string, string, string]
      const rows = this.memberships.get(leagueId) ?? []
      const next = rows.filter((row) => row.userId !== userId)
      next.push({ leagueId, userId, role, joinedAt })
      this.memberships.set(leagueId, next)
      return { rows: [] as T[] }
    }

    if (
      normalized.includes('from af_league_members where league_id = $1') &&
      normalized.includes('user_id = $2')
    ) {
      const [leagueId, userId] = params as [string, string]
      const row = (this.memberships.get(leagueId) ?? []).find((r) => r.userId === userId)
      return { rows: (row ? [row] : []) as T[] }
    }

    if (normalized.includes('from af_league_members where league_id = $1')) {
      const [leagueId] = params as [string]
      return { rows: ((this.memberships.get(leagueId) ?? []) as unknown) as T[] }
    }

    if (normalized.startsWith('insert into af_domain_events')) {
      const [id, _aggregateType, aggregateId, eventType, payload, occurredAt] = params as [
        string,
        string,
        string,
        string,
        Record<string, unknown>,
        string,
      ]
      this.domainEvents.push({
        id,
        aggregateId,
        eventType,
        payload,
        occurredAt,
      })
      return { rows: [] as T[] }
    }

    if (normalized.includes('from af_domain_events where aggregate_type =')) {
      const [aggregateId, maybeIdempotencyKey] = params as [string, string?]
      const filtered = this.domainEvents
        .filter((event) => event.aggregateId === aggregateId && event.eventType === 'RosterUpdated')
        .filter((event) => {
          if (typeof maybeIdempotencyKey !== 'string') return true
          return event.payload.idempotencyKey === maybeIdempotencyKey
        })
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

      const row = filtered[0]
      if (!row) {
        return { rows: [] as T[] }
      }
      return {
        rows: [
          {
            eventId: row.id,
            occurredAt: row.occurredAt,
            payload: row.payload,
          },
        ] as T[],
      }
    }

    if (normalized.startsWith('select data from af_league_settings_general')) {
      const [leagueId] = params as [string]
      const data = this.settingsGeneral.get(leagueId)
      return { rows: (data ? [{ data }] : []) as T[] }
    }

    if (normalized.startsWith('select data from af_league_settings_')) {
      return { rows: [] as T[] }
    }

    if (normalized.startsWith('select domain, max(version) as version from af_settings_versions')) {
      return { rows: [] as T[] }
    }

    if (normalized.startsWith('insert into af_league_settings_general')) {
      const [leagueId, data] = params as [string, Record<string, unknown>]
      this.settingsGeneral.set(leagueId, data)
      return { rows: [] as T[] }
    }

    if (normalized.startsWith('insert into af_settings_audit_log')) {
      return { rows: [] as T[] }
    }

    if (normalized.includes('from af_team_rosters tr join af_roster_entries re')) {
      const [leagueId, teamId] = params as [string, string]
      const key = `${leagueId}:${teamId}`
      return { rows: ((this.rosters.get(key) ?? []) as unknown) as T[] }
    }

    return { rows: [] as T[] }
  }
}

describe('platform-backend postgres app factory', () => {
  test('creates and reads league through postgres adapters', async () => {
    const sql = new FakeSqlExecutor()
    const app = createPostgresBackendApp(sql)

    const created = await app.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        params: {},
        headers: { 'x-correlation-id': 'corr-pg-create' },
        body: { name: 'Postgres League', sport: 'NFL', season: 2026 },
        ctx: {
          userId: 'user_pg_1',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(created.status).toBe(201)
    const leagueId = (created.data.league as { leagueId: string }).leagueId

    const fetched = await app.handlers.getLeagueById(
      buildHttpRequest({
        method: 'GET',
        path: `/api/leagues/${leagueId}`,
        params: { id: leagueId },
        headers: { 'x-correlation-id': 'corr-pg-get' },
        ctx: {
          userId: 'user_pg_1',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(fetched.status).toBe(200)
    expect((fetched.data.league as { leagueId: string }).leagueId).toBe(leagueId)
    expect(sql.domainEvents.some((e) => e.eventType === 'LeagueCreated')).toBe(true)
  })

  test('updates league settings through postgres adapters', async () => {
    const sql = new FakeSqlExecutor()
    const app = createPostgresBackendApp(sql)

    const created = await app.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        params: {},
        body: { name: 'Settings League', sport: 'NFL', season: 2026 },
        headers: { 'x-correlation-id': 'corr-pg-create-settings' },
        ctx: {
          userId: 'user_pg_2',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    const leagueId = (created.data.league as { leagueId: string }).leagueId

    const updated = await app.handlers.patchLeagueSettingsByDomain(
      buildHttpRequest({
        method: 'PATCH',
        path: `/api/leagues/${leagueId}/settings/general`,
        params: { id: leagueId, domain: 'general' },
        headers: {
          'x-correlation-id': 'corr-pg-settings',
          'idempotency-key': 'idem-pg-settings',
        },
        body: {
          payload: { tradeReviewHours: 24 },
          reason: 'Commissioner policy update',
        },
        ctx: {
          userId: 'user_pg_2',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(updated.status).toBe(200)
    expect(sql.settingsGeneral.get(leagueId)).toMatchObject({ tradeReviewHours: 24 })
    expect(sql.domainEvents.some((e) => e.eventType === 'SettingsUpdated')).toBe(true)
  })

  test('reads seeded roster entries through postgres adapters', async () => {
    const sql = new FakeSqlExecutor()
    const app = createPostgresBackendApp(sql)

    const created = await app.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        params: {},
        body: { name: 'Roster League', sport: 'NFL', season: 2026 },
        headers: { 'x-correlation-id': 'corr-pg-create-roster' },
        ctx: {
          userId: 'user_pg_3',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    const leagueId = (created.data.league as { leagueId: string }).leagueId
    const teamId = 'team_pg_1'
    const playerId = 'asset_pg_1'
    const key = `${leagueId}:${teamId}`

    sql.rosters.set(key, [
      {
        rosterId: 'roster_pg_1',
        leagueId,
        teamId,
        playerId,
        slotCode: 'QB',
        section: 'active',
        updatedAt: new Date().toISOString(),
      },
    ])

    const rosterRes = await app.handlers.getTeamRoster(
      buildHttpRequest({
        method: 'GET',
        path: `/api/leagues/${leagueId}/teams/${teamId}/roster`,
        params: { id: leagueId, teamId },
        headers: { 'x-correlation-id': 'corr-pg-roster' },
        ctx: {
          userId: 'user_pg_3',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(rosterRes.status).toBe(200)
    const roster = rosterRes.data.roster as {
      entries: Array<{ playerId: string; slotCode: string }>
    }
    expect(roster.entries.length).toBe(1)
    expect(roster.entries[0]).toMatchObject({ playerId, slotCode: 'QB' })
  })

  test('replays lineup across app instances via postgres repository lookup', async () => {
    const sql = new FakeSqlExecutor()
    const firstApp = createPostgresBackendApp(sql)

    const created = await firstApp.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        params: {},
        body: { name: 'Replay League', sport: 'NFL', season: 2026 },
        headers: { 'x-correlation-id': 'corr-pg-create-replay' },
        ctx: {
          userId: 'user_pg_4',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    const leagueId = (created.data.league as { leagueId: string }).leagueId
    const teamId = 'team_pg_replay'
    const idempotencyKey = 'idem-pg-replay-1'

    const firstSubmit = await firstApp.handlers.postTeamLineup(
      buildHttpRequest({
        method: 'POST',
        path: `/api/leagues/${leagueId}/teams/${teamId}/lineups/1`,
        params: { id: leagueId, teamId, weekOrPeriod: '1' },
        headers: {
          'x-correlation-id': 'corr-pg-replay-1',
          'idempotency-key': idempotencyKey,
        },
        body: {
          entries: [{ slotCode: 'QB', playerId: 'asset_pg_replay_1' }],
        },
        ctx: {
          userId: 'user_pg_4',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    const secondApp = createPostgresBackendApp(sql)
    const replaySubmit = await secondApp.handlers.postTeamLineup(
      buildHttpRequest({
        method: 'POST',
        path: `/api/leagues/${leagueId}/teams/${teamId}/lineups/1`,
        params: { id: leagueId, teamId, weekOrPeriod: '1' },
        headers: {
          'x-correlation-id': 'corr-pg-replay-2',
          'idempotency-key': idempotencyKey,
        },
        body: {
          entries: [{ slotCode: 'QB', playerId: 'asset_pg_replay_1' }],
        },
        ctx: {
          userId: 'user_pg_4',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(firstSubmit.status).toBe(202)
    expect(replaySubmit.status).toBe(202)

    const firstReceipt = firstSubmit.data.receipt as { submissionId: string; eventId: string }
    const replayReceipt = replaySubmit.data.receipt as { submissionId: string; eventId: string }

    expect(replayReceipt.submissionId).toBe(firstReceipt.submissionId)
    expect(replayReceipt.eventId).toBe(firstReceipt.eventId)
  })
})
