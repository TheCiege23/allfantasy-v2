import fs from 'node:fs'
import path from 'node:path'

type Bucket =
  | 'OK: sync job only'
  | 'OK: backend reads DB'
  | 'OK: exception annotated'
  | 'BAD: page load calls external API'
  | 'BAD: frontend guesses image/logo'
  | 'BAD: route rebuilds full draft pool'
  | 'BAD: AI call without cache check'
  | 'BAD: fantasy points calculated every request'

type Finding = {
  file: string
  line: number
  bucket: Bucket
  reason: string
  snippet: string
}

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'docs')
const DATE = new Date().toISOString().slice(0, 10)
const OUT_FILE = path.join(OUT_DIR, `DB_FIRST_ARCHITECTURE_AUDIT_${DATE}.md`)

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.next-dev-local',
  '.next-dev-local-uifix',
  '.vercel',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
])

const EXTERNAL_API_PATTERN = /https:\/\/(api\.sleeper\.app|site\.api\.espn\.com|api\.espn\.com|api\.sportsdata\.io|fantasysports\.yahooapis\.com|newsapi\.org|the-odds-api\.com)/i
const DB_READ_PATTERN = /prisma\.|from\s+['"]@\/lib\/prisma['"]|findMany\(|findFirst\(|findUnique\(/i
const IMAGE_GUESS_PATTERN = /buildHeadshotUrl|getTeamLogoUrl|headshot|logoUrl|imageUrl/i
const DRAFT_REBUILD_PATTERN = /getResolvedDraftPoolForLeague|buildAnnualDraftPool|runAdpImporter\(|attachPlayerMedia|normalizePlayerList|draft pool/i
const AI_CALL_PATTERN = /chat\.completions\.create\(|responses\.create\(|openaiChatText\(|openaiChatTextStream\(/i
const FANTASY_CALC_PATTERN = /calculateFantasy|fantasyPoints|projectedPoints/i

function isIngestionPath(rel: string): boolean {
  return (
    /^scripts\/.+/.test(rel) ||
    /^lib\/workers\//.test(rel) ||
    /^lib\/league-import\//.test(rel) ||
    /^lib\/sleeper\//.test(rel) ||
    /^app\/api\/cron\//.test(rel) ||
    /sync|ingest|import|backfill|worker|refresh|seed|migrate/i.test(rel)
  )
}

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listSourceFiles(full, out)
      continue
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full)
    }
  }
  return out
}

function relPath(abs: string): string {
  return path.relative(ROOT, abs).split(path.sep).join('/')
}

function classify(rel: string, line: string): { bucket: Bucket; reason: string } | null {
  const hasException = line.includes('db-first-exception')
  if (hasException) {
    return { bucket: 'OK: exception annotated', reason: 'line is explicitly annotated as temporary exception' }
  }

  if (EXTERNAL_API_PATTERN.test(line)) {
    if (isIngestionPath(rel)) {
      return { bucket: 'OK: sync job only', reason: 'external API call appears inside ingestion/sync path' }
    }
    if (rel.startsWith('app/api/')) {
      return { bucket: 'BAD: page load calls external API', reason: 'user-facing API route contains direct external API host' }
    }
    if (rel.startsWith('app/') || rel.startsWith('components/') || rel.startsWith('hooks/')) {
      return { bucket: 'BAD: page load calls external API', reason: 'frontend/page code references external API host' }
    }
    return { bucket: 'BAD: page load calls external API', reason: 'non-ingestion library references external API host' }
  }

  if (DRAFT_REBUILD_PATTERN.test(line) && (rel.startsWith('app/api/') || rel.startsWith('lib/'))) {
    if (isIngestionPath(rel)) {
      return { bucket: 'OK: sync job only', reason: 'draft pool work appears in ingestion/worker context' }
    }
    return { bucket: 'BAD: route rebuilds full draft pool', reason: 'draft pool assembly/refresh found in request-path code' }
  }

  if (AI_CALL_PATTERN.test(line) && rel.startsWith('app/api/')) {
    return { bucket: 'BAD: AI call without cache check', reason: 'AI call detected in route; verify DB cache-by-hash before model call' }
  }

  if (IMAGE_GUESS_PATTERN.test(line) && (rel.startsWith('app/') || rel.startsWith('components/') || rel.startsWith('hooks/') || rel.startsWith('lib/'))) {
    if (DB_READ_PATTERN.test(line)) {
      return { bucket: 'OK: backend reads DB', reason: 'media field appears in DB read path' }
    }
    return { bucket: 'BAD: frontend guesses image/logo', reason: 'media lookup/build logic found outside DB-backed asset layer' }
  }

  if (FANTASY_CALC_PATTERN.test(line) && rel.startsWith('app/api/')) {
    return { bucket: 'BAD: fantasy points calculated every request', reason: 'fantasy points/projection calculation keyword in route path' }
  }

  if (DB_READ_PATTERN.test(line) && (rel.startsWith('app/api/') || rel.startsWith('lib/'))) {
    return { bucket: 'OK: backend reads DB', reason: 'route/service includes direct Prisma read' }
  }

  return null
}

function main(): void {
  const files = listSourceFiles(ROOT)
  const findings: Finding[] = []

  for (const abs of files) {
    const rel = relPath(abs)
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/)

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (!line.trim()) continue

      const classified = classify(rel, line)
      if (!classified) continue

      findings.push({
        file: rel,
        line: i + 1,
        bucket: classified.bucket,
        reason: classified.reason,
        snippet: line.trim().slice(0, 220),
      })
    }
  }

  const byBucket = new Map<Bucket, Finding[]>()
  for (const f of findings) {
    const bucket = byBucket.get(f.bucket) ?? []
    bucket.push(f)
    byBucket.set(f.bucket, bucket)
  }

  const orderedBuckets: Bucket[] = [
    'BAD: page load calls external API',
    'BAD: route rebuilds full draft pool',
    'BAD: frontend guesses image/logo',
    'BAD: AI call without cache check',
    'BAD: fantasy points calculated every request',
    'OK: sync job only',
    'OK: backend reads DB',
    'OK: exception annotated',
  ]

  const lines: string[] = []
  lines.push('# DB-First Architecture Audit')
  lines.push('')
  lines.push(`- Date: ${DATE}`)
  lines.push(`- Files scanned: ${files.length}`)
  lines.push(`- Findings: ${findings.length}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  for (const bucket of orderedBuckets) {
    const count = byBucket.get(bucket)?.length ?? 0
    lines.push(`- ${bucket}: ${count}`)
  }

  for (const bucket of orderedBuckets) {
    const group = byBucket.get(bucket)
    if (!group || group.length === 0) continue

    lines.push('')
    lines.push(`## ${bucket}`)
    lines.push('')

    for (const item of group.slice(0, 150)) {
      lines.push(`- ${item.file}:${item.line} - ${item.reason}`)
      lines.push(`  - ${item.snippet}`)
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, `${lines.join('\n')}\n`, 'utf8')

  console.log(`Wrote ${OUT_FILE}`)
  console.log(`Findings: ${findings.length}`)
}

main()
