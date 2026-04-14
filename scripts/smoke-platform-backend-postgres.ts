import * as dotenv from 'dotenv'
import { buildHttpRequest } from '../platform-backend/src/http/request-factory'
import { createPostgresBackendApp } from '../platform-backend/src/app-postgres'
import { createPrismaSqlExecutor } from '../platform-backend/src/repositories/postgres/prisma-executor'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

type ScriptResult = {
	ok: boolean
	skippedWrites?: boolean
	leagueId?: string
	teamId?: string
	assetId?: string
	rosterId?: string
	postLeagueStatus?: number
	updateSettingsStatus?: number
	getLeagueStatus?: number
	getSettingsStatus?: number
	getRosterStatus?: number
	rosterEntryCount?: number
	rosterHasSeededAsset?: boolean
	postLineupStatus?: number
	replayLineupStatus?: number
	lineupReplay?: {
		idempotentReplay: boolean
		sameSubmissionId: boolean
		sameEventId: boolean
	}
	error?: string
	preflight?: {
		afLeaguesFound: boolean
		hasReplayIndexes?: boolean
	}
}

function shouldSkipWrites(): boolean {
	const value = process.env.AF_SKIP_SMOKE_WRITES?.trim().toLowerCase()
	const envEnabled = value === '1' || value === 'true' || value === 'yes'
	const argEnabled = process.argv.includes('--skip-writes')
	return envEnabled || argEnabled
}

async function hasReplayIndexes(sqlExecutor: ReturnType<typeof createPrismaSqlExecutor>): Promise<boolean> {
	const result = await sqlExecutor.query<{ count: number | string }>(
		"select count(*)::int as \"count\" from pg_indexes where schemaname = 'public' and indexname in ('idx_af_domain_events_roster_latest', 'idx_af_domain_events_roster_idempotency')",
	)
	return Number(result.rows[0]?.count ?? 0) === 2
}

async function afFoundationReady(sqlExecutor: ReturnType<typeof createPrismaSqlExecutor>) {
	const result = await sqlExecutor.query<{ afLeagues: string | null }>(
		"select to_regclass('public.af_leagues')::text as \"afLeagues\"",
	)
	return Boolean(result.rows[0]?.afLeagues)
}

async function run(): Promise<ScriptResult> {
	const sqlExecutor = createPrismaSqlExecutor()
	const afLeaguesFound = await afFoundationReady(sqlExecutor)
	const replayIndexesFound = await hasReplayIndexes(sqlExecutor)
	const smokeUserId = '00000000-0000-4000-8000-000000000001'

	if (!afLeaguesFound) {
		return {
			ok: false,
			preflight: { afLeaguesFound, hasReplayIndexes: replayIndexesFound },
			error:
				'missing_af_foundation_tables: apply docs/backend/ALLFANTASY_BACKEND_FOUNDATION.sql to the target database, then re-run this smoke script',
		}
	}

	if (!replayIndexesFound) {
		return {
			ok: false,
			preflight: { afLeaguesFound, hasReplayIndexes: replayIndexesFound },
			error:
				'missing_platform_backend_replay_indexes: run npm run db:indexes:platform-backend and re-run smoke',
		}
	}

	if (shouldSkipWrites()) {
		return {
			ok: true,
			skippedWrites: true,
			preflight: { afLeaguesFound, hasReplayIndexes: replayIndexesFound },
		}
	}

	await sqlExecutor.query(
		'insert into af_users (id, email, is_active, created_at, updated_at) values ($1::uuid, $2, true, now(), now()) on conflict (id) do nothing',
		[smokeUserId, 'smoke-commissioner@allfantasy.local'],
	)

	const app = createPostgresBackendApp(sqlExecutor)

	const correlationSeed = `pg-smoke-${Date.now()}`

	const createLeagueResponse = await app.handlers.postLeagues(
		buildHttpRequest({
			method: 'POST',
			path: '/api/leagues',
			params: {},
			headers: {
				'x-correlation-id': `${correlationSeed}-create`,
				'idempotency-key': `${correlationSeed}-create-idem`,
			},
			body: {
				name: `Postgres Smoke ${new Date().toISOString().slice(0, 19)}`,
				sport: 'NFL',
				season: new Date().getUTCFullYear(),
			},
			ctx: {
				userId: smokeUserId,
				leagueRoles: [],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	if (createLeagueResponse.status !== 201) {
		return {
			ok: false,
			postLeagueStatus: createLeagueResponse.status,
			error: String((createLeagueResponse.data.error as string | undefined) ?? 'create_league_failed'),
		}
	}

	const league = createLeagueResponse.data.league as { leagueId: string }

	const updateSettingsResponse = await app.handlers.patchLeagueSettingsByDomain(
		buildHttpRequest({
			method: 'PATCH',
			path: `/api/leagues/${league.leagueId}/settings/general`,
			params: { id: league.leagueId, domain: 'general' },
			headers: {
				'x-correlation-id': `${correlationSeed}-settings`,
				'idempotency-key': `${correlationSeed}-settings-idem`,
			},
			body: {
				payload: { tradeReviewHours: 24, waiverBudget: 200 },
				reason: 'platform-backend postgres smoke script',
			},
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const getLeagueResponse = await app.handlers.getLeagueById(
		buildHttpRequest({
			method: 'GET',
			path: `/api/leagues/${league.leagueId}`,
			params: { id: league.leagueId },
			headers: { 'x-correlation-id': `${correlationSeed}-get-league` },
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const getSettingsResponse = await app.handlers.getLeagueSettingsByDomain(
		buildHttpRequest({
			method: 'GET',
			path: `/api/leagues/${league.leagueId}/settings/general`,
			params: { id: league.leagueId, domain: 'general' },
			headers: { 'x-correlation-id': `${correlationSeed}-get-settings` },
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const teamId = crypto.randomUUID()
	const playerId = crypto.randomUUID()
	const assetId = crypto.randomUUID()
	const rosterId = crypto.randomUUID()
	const rosterEntryId = crypto.randomUUID()

	await sqlExecutor.query(
		'insert into af_teams (id, league_id, owner_user_id, team_name, created_at, updated_at) values ($1::uuid, $2::uuid, $3::uuid, $4, now(), now()) on conflict (id) do nothing',
		[teamId, league.leagueId, smokeUserId, 'Smoke Team'],
	)

	await sqlExecutor.query(
		'insert into af_players (id, sport, display_name, created_at, updated_at) values ($1::uuid, $2, $3, now(), now()) on conflict (id) do nothing',
		[playerId, 'NFL', 'Smoke Player'],
	)

	await sqlExecutor.query(
		"insert into af_assets (id, league_id, asset_type, player_id, metadata, created_at) values ($1::uuid, $2::uuid, 'player', $3::uuid, '{}'::jsonb, now()) on conflict (id) do nothing",
		[assetId, league.leagueId, playerId],
	)

	await sqlExecutor.query(
		'insert into af_team_rosters (id, league_id, team_id, created_at) values ($1::uuid, $2::uuid, $3::uuid, now()) on conflict (league_id, team_id) do nothing',
		[rosterId, league.leagueId, teamId],
	)

	await sqlExecutor.query(
		"insert into af_roster_entries (id, roster_id, asset_id, section, slot_code, acquired_at, metadata) values ($1::uuid, $2::uuid, $3::uuid, 'active', 'QB', now(), '{}'::jsonb) on conflict (roster_id, asset_id) do nothing",
		[rosterEntryId, rosterId, assetId],
	)

	const getRosterResponse = await app.handlers.getTeamRoster(
		buildHttpRequest({
			method: 'GET',
			path: `/api/leagues/${league.leagueId}/teams/${teamId}/roster`,
			params: { id: league.leagueId, teamId },
			headers: { 'x-correlation-id': `${correlationSeed}-get-roster` },
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const roster = getRosterResponse.data.roster as
		| { entries?: Array<{ playerId?: string }> }
		| undefined
	const rosterEntries = Array.isArray(roster?.entries) ? roster.entries : []
	const rosterHasSeededAsset = rosterEntries.some((entry) => entry.playerId === assetId)

	const lineupIdempotencyKey = `${correlationSeed}-lineup-idem`

	const submitLineupResponse = await app.handlers.postTeamLineup(
		buildHttpRequest({
			method: 'POST',
			path: `/api/leagues/${league.leagueId}/teams/${teamId}/lineups/1`,
			params: { id: league.leagueId, teamId, weekOrPeriod: '1' },
			headers: {
				'x-correlation-id': `${correlationSeed}-lineup`,
				'idempotency-key': lineupIdempotencyKey,
			},
			body: {
				entries: [{ slotCode: 'QB', playerId: assetId }],
			},
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const replayLineupResponse = await app.handlers.postTeamLineup(
		buildHttpRequest({
			method: 'POST',
			path: `/api/leagues/${league.leagueId}/teams/${teamId}/lineups/1`,
			params: { id: league.leagueId, teamId, weekOrPeriod: '1' },
			headers: {
				'x-correlation-id': `${correlationSeed}-lineup`,
				'idempotency-key': lineupIdempotencyKey,
			},
			body: {
				entries: [{ slotCode: 'QB', playerId: assetId }],
			},
			ctx: {
				userId: smokeUserId,
				leagueRoles: ['commissioner'],
				systemRoles: ['member'],
				entitlements: [],
			},
		}),
	)

	const firstReceipt = submitLineupResponse.data.receipt as
		| { submissionId: string; eventId: string }
		| undefined
	const replayReceipt = replayLineupResponse.data.receipt as
		| { submissionId: string; eventId: string }
		| undefined

	const lineupReplay = {
		idempotentReplay: Boolean(
			(replayLineupResponse.data.meta as Record<string, unknown> | undefined)?.idempotentReplay,
		),
		sameSubmissionId:
			Boolean(firstReceipt?.submissionId) && firstReceipt?.submissionId === replayReceipt?.submissionId,
		sameEventId: Boolean(firstReceipt?.eventId) && firstReceipt?.eventId === replayReceipt?.eventId,
	}

	const ok =
		updateSettingsResponse.status === 200 &&
		getLeagueResponse.status === 200 &&
		getSettingsResponse.status === 200 &&
		getRosterResponse.status === 200 &&
		rosterHasSeededAsset &&
		submitLineupResponse.status === 202 &&
		replayLineupResponse.status === 202 &&
		lineupReplay.idempotentReplay &&
		lineupReplay.sameSubmissionId &&
		lineupReplay.sameEventId

  return {
    ok,
    preflight: { afLeaguesFound, hasReplayIndexes: replayIndexesFound },
    leagueId: league.leagueId,
    teamId,
    assetId,
    rosterId,
    postLeagueStatus: createLeagueResponse.status,
    updateSettingsStatus: updateSettingsResponse.status,
    getLeagueStatus: getLeagueResponse.status,
    getSettingsStatus: getSettingsResponse.status,
    getRosterStatus: getRosterResponse.status,
    rosterEntryCount: rosterEntries.length,
    rosterHasSeededAsset,
    postLineupStatus: submitLineupResponse.status,
    replayLineupStatus: replayLineupResponse.status,
    lineupReplay,
    error:
      !ok
        ? String(
            (submitLineupResponse.data.error as string | undefined) ??
              (updateSettingsResponse.data.error as string | undefined) ??
              'postgres_smoke_failed',
          )
        : undefined,
  }
}

void run()
	.then((result) => {
		console.log(JSON.stringify(result, null, 2))
		if (!result.ok) {
			process.exit(1)
		}
	})
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error)
		console.error('[smoke-platform-backend-postgres] failed', message)
		process.exit(1)
	})
