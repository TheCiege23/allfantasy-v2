import * as dotenv from 'dotenv'
import { createPrismaSqlExecutor } from '../platform-backend/src/repositories/postgres/prisma-executor'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const INDEXES_BY_TABLE: Record<string, readonly string[]> = {
  af_domain_events: [
    'idx_af_domain_events_unpublished',
    'idx_af_domain_events_roster_latest',
    'idx_af_domain_events_roster_idempotency',
  ],
  af_job_runs: ['idx_af_job_runs_queue_status'],
}

type IndexRow = {
  indexname: string
}

type TableRow = {
  tablename: string
}

async function main() {
  const sql = createPrismaSqlExecutor()
  const tables = await sql.query<TableRow>(
    `select tablename from pg_tables where schemaname = 'public' and tablename in ('af_domain_events', 'af_job_runs')`,
  )
  const present = new Set(tables.rows.map((r) => r.tablename))

  const required: string[] = []
  for (const [table, indexes] of Object.entries(INDEXES_BY_TABLE)) {
    if (present.has(table)) required.push(...indexes)
  }

  if (required.length === 0) {
    const output = {
      ok: true,
      skipped: 'foundation tables af_domain_events / af_job_runs not present — index verify skipped',
      found: [] as string[],
      missing: [] as string[],
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  const result = await sql.query<IndexRow>(
    `select indexname from pg_indexes where schemaname = 'public' and indexname in (${required.map((n) => `'${n}'`).join(', ')})`,
  )

  const found = new Set(result.rows.map((row) => row.indexname))
  const missing = required.filter((name) => !found.has(name))

  const output = {
    ok: missing.length === 0,
    found: [...found].sort(),
    missing,
  }

  console.log(JSON.stringify(output, null, 2))

  if (missing.length > 0) {
    process.exit(1)
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[verify-platform-backend-indexes] failed', message)
  process.exit(1)
})
