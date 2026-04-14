import * as dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'
import { createPrismaSqlExecutor } from '../platform-backend/src/repositories/postgres/prisma-executor'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const REQUIRED_INDEXES = [
  'idx_af_domain_events_unpublished',
  'idx_af_domain_events_roster_latest',
  'idx_af_domain_events_roster_idempotency',
  'idx_af_job_runs_queue_status',
] as const

type PreflightRow = {
  afLeagues: string | null
  hasLeagueStatusType: boolean
}

type IndexRow = {
  indexname: string
}

function runFoundationApply(): number {
  const result = spawnSync(
    'npx',
    [
      'prisma',
      'db',
      'execute',
      '--file',
      'docs/backend/ALLFANTASY_BACKEND_FOUNDATION.sql',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    },
  )

  if (typeof result.status === 'number') {
    return result.status
  }
  return result.error ? 1 : 0
}

function runIndexApply(): number {
  const result = spawnSync(
    'npx',
    [
      'prisma',
      'db',
      'execute',
      '--file',
      'scripts/sql/platform-backend-indexes.sql',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    },
  )

  if (typeof result.status === 'number') {
    return result.status
  }
  return result.error ? 1 : 0
}

async function main() {
  const sql = createPrismaSqlExecutor()
  const { rows } = await sql.query<PreflightRow>(
    "select to_regclass('public.af_leagues')::text as \"afLeagues\", exists(select 1 from pg_type where typname = 'af_league_status') as \"hasLeagueStatusType\"",
  )

  const preflight = rows[0]
  const alreadyApplied = Boolean(preflight?.afLeagues) || Boolean(preflight?.hasLeagueStatusType)

  if (alreadyApplied) {
    // Foundation tables exist — but verify supplemental indexes are present.
    // A DB could have the tables from a previous run without ever getting the indexes applied.
    const inList = REQUIRED_INDEXES.map((n) => `'${n}'`).join(', ')
    const { rows: idxRows } = await sql.query<IndexRow>(
      `select indexname from pg_indexes where schemaname = 'public' and indexname in (${inList})`,
    )
    const found = new Set(idxRows.map((r) => r.indexname))
    const missingIndexes = REQUIRED_INDEXES.filter((n) => !found.has(n))

    if (missingIndexes.length > 0) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            applied: false,
            reason: 'af_foundation_already_present',
            preflight,
            indexes: { missing: missingIndexes, applying: true },
          },
          null,
          2,
        ),
      )
      const status = runIndexApply()
      if (status !== 0) {
        process.exit(status)
      }
      console.log(JSON.stringify({ ok: true, indexesApplied: true, missing: missingIndexes }, null, 2))
    } else {
      console.log(
        JSON.stringify(
          {
            ok: true,
            applied: false,
            reason: 'af_foundation_already_present',
            preflight,
            indexes: { ok: true },
          },
          null,
          2,
        ),
      )
    }
    return
  }

  const status = runFoundationApply()
  if (status !== 0) {
    process.exit(status)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: true,
      },
      null,
      2,
    ),
  )
}

export { main }

// Only auto-execute when run directly as a script, not when imported by tests
if (process.argv[1]?.includes('apply-af-foundation-if-needed')) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[apply-af-foundation-if-needed] failed', message)
    process.exit(1)
  })
}
