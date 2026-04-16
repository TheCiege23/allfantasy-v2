import { Client } from 'pg'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })

const raw = process.env.SUPABASE_SOURCE_URL || process.env.supabase_source_url || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
if (!raw) {
  console.error('missing source url')
  process.exit(1)
}

const base = new URL(raw)
const refMatch = (base.hostname || '').match(/^db\.([a-z0-9]+)\.supabase\.co$/i)
const ref = refMatch ? refMatch[1] : null

const candidates = [raw]
if (ref) {
  const hosts = ['aws-0-us-west-2.pooler.supabase.com', 'aws-0-us-east-1.pooler.supabase.com']
  const ports = ['5432', '6543']
  for (const h of hosts) {
    for (const p of ports) {
      const c = new URL(raw)
      c.hostname = h
      c.port = p
      c.username = `postgres.${ref}`
      candidates.push(c.toString())
    }
  }
}

for (const connectionString of candidates) {
  const u = new URL(connectionString)
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const r = await client.query('select current_database() as db, current_user as usr')
    console.log('ok', u.hostname, u.port || 'default', r.rows[0].db, r.rows[0].usr)
    await client.end()
    process.exit(0)
  } catch (e) {
    console.log('fail', u.hostname, u.port || 'default', e instanceof Error ? e.message : String(e))
    try { await client.end() } catch {}
  }
}

process.exit(2)
