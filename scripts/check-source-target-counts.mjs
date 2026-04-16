import { Client } from 'pg'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })

function deriveSourceUrl() {
  const raw =
    process.env.SUPABASE_SOURCE_URL ||
    process.env.supabase_source_url ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  if (!raw) throw new Error('Missing Supabase source URL')

  const u = new URL(raw)
  const m = (u.hostname || '').match(/^db\.([a-z0-9]+)\.supabase\.co$/i)
  if (!m) return raw
  const ref = m[1]
  u.hostname = 'aws-0-us-west-2.pooler.supabase.com'
  u.port = '5432'
  u.username = `postgres.${ref}`
  return u.toString()
}

const sourceUrl = deriveSourceUrl()
const targetUrl = process.env.DATABASE_URL || process.env.database_url
if (!targetUrl) throw new Error('Missing Neon target URL')

const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } })

const tables = ['api_call_log', 'api_rate_limits']

await source.connect()
await target.connect()

for (const table of tables) {
  const s = await source.query(`select count(*)::bigint as c from "${table}"`)
  const t = await target.query(`select count(*)::bigint as c from "${table}"`)
  console.log(`${table}: source=${s.rows[0].c} target=${t.rows[0].c}`)
}

await source.end()
await target.end()
