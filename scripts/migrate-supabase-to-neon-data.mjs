import { Client } from 'pg'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function chunk(array, size) {
  const out = []
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size))
  return out
}

function quoteIdent(id) {
  return `"${id.replace(/"/g, '""')}"`
}

const sourceUrl =
  process.env.SUPABASE_SOURCE_URL ||
  process.env.supabase_source_url ||
  process.env.SOURCE_DATABASE_URL ||
  process.env.source_database_url ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL
const targetUrl =
  process.env.NEON_DATABASE_URL ||
  process.env.neon_database_url ||
  process.env.DATABASE_URL ||
  process.env.database_url

if (!sourceUrl) {
  throw new Error(
    'Missing source URL. Expected SUPABASE_SOURCE_URL, SOURCE_DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL.'
  )
}
if (!targetUrl) throw new Error('Missing target URL. Expected NEON_DATABASE_URL or DATABASE_URL for Neon.')

const sourceHost = (sourceUrl.match(/^[a-zA-Z0-9+.-]+:\/\/(?:[^@/]+@)?([^:/?]+)/) || [])[1] || ''
const targetHost = (targetUrl.match(/^[a-zA-Z0-9+.-]+:\/\/(?:[^@/]+@)?([^:/?]+)/) || [])[1] || ''

if (!sourceHost.includes('supabase.co')) {
  throw new Error(`Safety check failed: source host does not look like Supabase: ${sourceHost}`)
}
if (!targetHost.includes('neon.tech')) {
  throw new Error(`Safety check failed: target host does not look like Neon: ${targetHost}`)
}

const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } })

const excludedTables = new Set(['_prisma_migrations'])

async function getPublicTables(client) {
  const { rows } = await client.query(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `
  )
  return rows.map((r) => r.tablename).filter((t) => !excludedTables.has(t))
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position ASC
    `,
    [table]
  )
  return rows.map((r) => r.column_name)
}

async function getJsonColumns(client, table) {
  const { rows } = await client.query(
    `
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND (
          data_type IN ('json', 'jsonb')
          OR udt_name IN ('json', 'jsonb')
        )
    `,
    [table]
  )
  const out = new Map()
  for (const r of rows) {
    out.set(r.column_name, { nullable: r.is_nullable === 'YES' })
  }
  return out
}

function normalizeJsonValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

function buildRowValues(row, cols, jsonCols, forceNullJson = false) {
  return cols.map((c) => {
    const value = row[c]
    if (!jsonCols.has(c)) return value
    const meta = jsonCols.get(c)
    if (forceNullJson) return meta?.nullable ? null : []
    const normalized = normalizeJsonValue(value)
    if (normalized === null && !meta?.nullable) return []
    return normalized
  })
}

async function insertRows(targetClient, table, cols, jsonCols, rows, forceNullJson = false) {
  if (rows.length === 0) return
  const colSql = cols.map(quoteIdent).join(', ')
  const values = []
  const placeholders = []
  let p = 1
  for (const row of rows) {
    const rowVals = buildRowValues(row, cols, jsonCols, forceNullJson)
    values.push(...rowVals)
    const rowPlaceholders = rowVals.map(() => `$${p++}`).join(', ')
    placeholders.push(`(${rowPlaceholders})`)
  }
  const insertSql = `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES ${placeholders.join(', ')}`
  await targetClient.query(insertSql, values)
}

async function countTable(client, table) {
  const sql = `SELECT COUNT(*)::bigint AS c FROM ${quoteIdent(table)}`
  const { rows } = await client.query(sql)
  return Number(rows[0].c)
}

async function copyTable(table) {
  const sourceCols = await getColumns(source, table)
  const targetCols = await getColumns(target, table)
  const sourceColSet = new Set(sourceCols)
  const cols = targetCols.filter((c) => sourceColSet.has(c))
  const jsonCols = await getJsonColumns(target, table)
  if (cols.length === 0) return { table, sourceCount: 0, targetCount: 0 }

  const colSql = cols.map(quoteIdent).join(', ')
  const selectSql = `SELECT ${colSql} FROM ${quoteIdent(table)}`
  const srcRows = (await source.query(selectSql)).rows

  if (srcRows.length > 0) {
    const batches = chunk(srcRows, 250)
    for (const batch of batches) {
      try {
        await insertRows(target, table, cols, jsonCols, batch, false)
      } catch {
        // Batch failed (often malformed legacy JSON in one row); retry row-by-row.
        for (const row of batch) {
          try {
            await insertRows(target, table, cols, jsonCols, [row], false)
          } catch {
            try {
              await insertRows(target, table, cols, jsonCols, [row], true)
            } catch (e3) {
              const msg = e3 instanceof Error ? e3.message : String(e3)
              throw new Error(`Row fallback failed: ${msg}`)
            }
          }
        }
      }
    }
  }

  const sourceCount = srcRows.length
  const targetCount = await countTable(target, table)
  return { table, sourceCount, targetCount }
}

async function run() {
  console.log(`Source host: ${sourceHost}`)
  console.log(`Target host: ${targetHost}`)
  await source.connect()
  await target.connect()

  const sourceTables = await getPublicTables(source)
  const targetTables = await getPublicTables(target)
  const targetTableSet = new Set(targetTables)

  const tables = sourceTables.filter((t) => targetTableSet.has(t))
  const missingInTarget = sourceTables.filter((t) => !targetTableSet.has(t))

  if (missingInTarget.length > 0) {
    console.log(`Skipping ${missingInTarget.length} source tables missing in target schema.`)
  }

  console.log(`Preparing to copy ${tables.length} public tables...`)

  if (tables.length > 0) {
    const truncateSql = `TRUNCATE TABLE ${tables.map(quoteIdent).join(', ')} RESTART IDENTITY CASCADE`
    await target.query(truncateSql)
  }

  const results = []
  const deferredTables = []
  for (const table of tables) {
    console.log(`COPY ${table} ...`)
    let result
    try {
      result = await copyTable(table)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/foreign key constraint/i.test(msg)) {
        console.warn(`DEFER ${table}: ${msg}`)
        try {
          await target.query(`TRUNCATE TABLE ${quoteIdent(table)} CASCADE`)
        } catch {}
        deferredTables.push(table)
        continue
      }
      throw new Error(`Table ${table} failed: ${msg}`)
    }
    results.push(result)
    const mark = result.sourceCount === result.targetCount ? 'OK' : 'MISMATCH'
    console.log(`${mark} ${table}: ${result.sourceCount} -> ${result.targetCount}`)
  }

  if (deferredTables.length > 0) {
    console.log(`Retrying ${deferredTables.length} deferred table(s) after first pass...`)
    for (const table of deferredTables) {
      console.log(`RETRY ${table} ...`)
      let result
      try {
        result = await copyTable(table)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`Deferred table ${table} failed: ${msg}`)
      }
      results.push(result)
      const mark = result.sourceCount === result.targetCount ? 'OK' : 'MISMATCH'
      console.log(`${mark} ${table}: ${result.sourceCount} -> ${result.targetCount}`)
    }
  }

  const mismatches = results.filter((r) => r.sourceCount !== r.targetCount)
  if (mismatches.length > 0) {
    console.error(`Found ${mismatches.length} table count mismatches.`)
    process.exitCode = 1
  } else {
    const total = results.reduce((sum, r) => sum + r.targetCount, 0)
    console.log(`Data migration complete. Copied ${total} rows across ${results.length} tables.`)
  }
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await source.end().catch(() => {})
    await target.end().catch(() => {})
  })
