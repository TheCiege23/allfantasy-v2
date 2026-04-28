#!/usr/bin/env node
/**
 * Non-destructive env checklist for draft room / deploy gate.
 * Prints SET or MISSING only — never secret values.
 *
 * Usage: node scripts/draft-env-check.mjs
 * Loads .env from project root when present (no dotenv package required).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile() {
  const p = resolve(root, '.env')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v
  }
}

loadEnvFile()

const ROLLING_KEYS = Object.keys(process.env).filter(
  (k) => /ROLLING|RAPID|INSIGHTS|RI_/i.test(k) && k.length < 64,
)

const KEYS = [
  ['DATABASE_URL', 'Postgres (Neon) — required for app + Prisma'],
  ['DIRECT_URL', 'Optional Neon direct / migrate URL'],
  ['NEXTAUTH_SECRET', 'NextAuth / session signing'],
  ['CRON_SECRET', 'Vercel cron + /api/cron/* bearer'],
  ['NEXT_PUBLIC_USE_ALLFANTASY_ADP', 'AllFantasy AI ADP feature (true to enable)'],
  ['NEXT_PUBLIC_ALLFANTASY_ADP_DRAFT_MODE', 'real | test | mock — default real when unset'],
  ['SPORTSDATAIO_KEY', 'SportsDataIO if used by ingestion'],
  ['THESPORTSDB_API_KEY', 'TheSportsDB if used for media'],
  ['THEAUDIODB_API_KEY', 'TheAudioDB premium media lookup (fallback source for TheSportsDB flows)'],
  ['thesportsdb_api_key', 'Alias accepted for THESPORTSDB_API_KEY in some deployment UIs'],
  ['theaudiodb_api_key', 'Alias accepted for THEAUDIODB_API_KEY in some deployment UIs'],
  ['OPENAI_API_KEY', 'OpenAI (Chimmy / AI features)'],
  ['XAI_API_KEY', 'xAI if enabled'],
  ['DEEPSEEK_API_KEY', 'DeepSeek if enabled'],
  ['STRIPE_SECRET_KEY', 'Stripe if draft touches billing'],
  ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Stripe publishable if checkout in browser'],
]

function status(key) {
  const v = process.env[key]
  if (v == null || String(v).trim() === '') return 'MISSING'
  return 'SET'
}

console.log('Draft / launch env checklist (values never printed)\n')
for (const [key, note] of KEYS) {
  console.log(`  [${status(key).padEnd(7)}] ${key}`)
  if (note) console.log(`           ${note}`)
}

console.log('  [scan ] Rolling Insights–related env keys:')
if (ROLLING_KEYS.length === 0) {
  console.log('           (none found — optional or named differently)')
} else {
  for (const k of ROLLING_KEYS.slice(0, 20)) {
    const st = process.env[k] && String(process.env[k]).trim() ? 'SET' : 'MISSING'
    console.log(`           [${st}] ${k}`)
  }
  if (ROLLING_KEYS.length > 20) console.log(`           … +${ROLLING_KEYS.length - 20} more`)
}
