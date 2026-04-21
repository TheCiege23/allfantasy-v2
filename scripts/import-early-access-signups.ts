/**
 * Import EarlyAccessSignup records from legacy JSON dumps.
 *
 * Usage:
 *   npx tsx scripts/import-early-access-signups.ts --dry-run
 *   npx tsx scripts/import-early-access-signups.ts --commit
 *
 * Safety:
 *   - Idempotent: skips emails that already exist in the DB.
 *   - No destructive updates: does NOT modify existing rows.
 *   - Dry-run is the default; you must pass --commit to write.
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type LegacyRecord = {
  id?: number
  name?: string | null
  email?: string | null
  consent?: boolean
  timestamp?: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  referrer?: string | null
}

const SOURCE_FILES = [
  'C:/Users/Guap_/Downloads/signups.json',
  'C:/Users/Guap_/Downloads/signups (1).json',
]

const IMPORT_SOURCE_TAG = 'legacy-import'

function parseArgs(): { commit: boolean } {
  const args = process.argv.slice(2)
  return { commit: args.includes('--commit') }
}

function loadRecords(): LegacyRecord[] {
  const out: LegacyRecord[] = []
  for (const file of SOURCE_FILES) {
    if (!fs.existsSync(file)) {
      console.warn(`[import] skipping missing file: ${file}`)
      continue
    }
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      console.warn(`[import] skipping non-array file: ${file}`)
      continue
    }
    out.push(...parsed)
    console.log(`[import] loaded ${parsed.length} records from ${path.basename(file)}`)
  }
  return out
}

function dedupeByEmail(records: LegacyRecord[]): LegacyRecord[] {
  const seen = new Map<string, LegacyRecord>()
  for (const r of records) {
    const email = String(r.email ?? '').trim().toLowerCase()
    if (!email) continue
    if (!seen.has(email)) seen.set(email, r)
  }
  return [...seen.values()]
}

async function main() {
  const { commit } = parseArgs()
  const mode = commit ? 'COMMIT' : 'DRY-RUN'
  console.log(`[import] mode: ${mode}`)

  const all = loadRecords()
  const unique = dedupeByEmail(all)
  console.log(`[import] ${all.length} total records, ${unique.length} unique emails after dedupe`)

  const emails = unique
    .map((r) => String(r.email ?? '').trim().toLowerCase())
    .filter((e) => e.length > 0)
  const existing = await prisma.earlyAccessSignup.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  })
  const existingSet = new Set(existing.map((e) => e.email))
  console.log(`[import] ${existingSet.size} emails already present in EarlyAccessSignup`)

  const toCreate = unique.filter((r) => {
    const email = String(r.email ?? '').trim().toLowerCase()
    return email && !existingSet.has(email)
  })
  console.log(`[import] ${toCreate.length} net-new records to insert`)

  if (!commit) {
    console.log('\n[import] DRY-RUN — no writes. Sample of first 5 net-new:')
    for (const r of toCreate.slice(0, 5)) {
      console.log(`  - ${r.email}  (${r.name ?? ''})  @${r.timestamp ?? '<no-ts>'}`)
    }
    console.log('\n[import] re-run with --commit to write these rows.')
    return
  }

  let created = 0
  let skipped = 0
  let failed = 0
  for (const r of toCreate) {
    const email = String(r.email ?? '').trim().toLowerCase()
    if (!email) continue
    try {
      const createdAt = r.timestamp ? new Date(r.timestamp) : new Date()
      const safeCreatedAt = Number.isFinite(createdAt.getTime()) ? createdAt : new Date()
      await prisma.earlyAccessSignup.create({
        data: {
          email,
          name: r.name?.trim() ? r.name.trim().slice(0, 200) : null,
          source: IMPORT_SOURCE_TAG,
          utmSource: r.utmSource ?? null,
          utmMedium: r.utmMedium ?? null,
          utmCampaign: r.utmCampaign ?? null,
          utmContent: r.utmContent ?? null,
          utmTerm: r.utmTerm ?? null,
          referrer: r.referrer ?? null,
          createdAt: safeCreatedAt,
        },
      })
      created += 1
    } catch (err: any) {
      // Unique-constraint race — another process inserted between findMany and now.
      if (err?.code === 'P2002') {
        skipped += 1
      } else {
        failed += 1
        console.error(`[import] failed for ${email}:`, err?.message ?? err)
      }
    }
  }

  console.log(`\n[import] COMMIT summary: created=${created}, skipped=${skipped}, failed=${failed}`)
}

main()
  .catch((err) => {
    console.error('[import] fatal:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
