import * as dotenv from 'dotenv'
import { createPrismaSqlExecutor } from '../platform-backend/src/repositories/postgres/prisma-executor'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const REQUIRED_INDEXES = [
  'idx_af_domain_events_unpublished',
  'idx_af_domain_events_roster_latest',
  'idx_af_domain_events_roster_idempotency',
  'idx_af_job_runs_queue_status',
] as const

type IndexRow = {
  indexname: string
}

async function main() {
  const sql = createPrismaSqlExecutor()
  const result = await sql.query<IndexRow>(
    `select indexname from pg_indexes where schemaname = 'public' and indexname in (${REQUIRED_INDEXES.map((n) => `'${n}'`).join(', ')})`,
  )

  const found = new Set(result.rows.map((row) => row.indexname))
  const missing = REQUIRED_INDEXES.filter((name) => !found.has(name))

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
