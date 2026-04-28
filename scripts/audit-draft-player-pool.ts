/**
 * Player Pool Identity Cleanup — audit (READ-ONLY).
 *
 * Diagnoses player pool data quality before any cleanup writes happen.
 * Reports duplicate identity groups, missing fields, image classifications,
 * suspicious ADP, rookie/DEF counts, and named samples.
 *
 * USAGE
 *   npx tsx scripts/audit-draft-player-pool.ts --league=<leagueId>
 *
 * Optional:
 *   --sport=NFL           Currently NFL only (other sports return early).
 *   --season=2025         Informational; resolver picks ADP season itself.
 *   --samples=20          Per-bucket sample count (default 20, max 50).
 *   --names="A,B,C"       Comma-separated specific player names to inspect.
 *                         Default: Russell Wilson, Marvin Harrison Jr.,
 *                                   De'Von Achane, Ja'Marr Chase, A.J. Brown,
 *                                   Saquon Barkley, Ashton Jeanty.
 *   --json                JSON-only output.
 *   --limit=N             Pool fetch limit (default 500, max 1000).
 *
 * NEVER WRITES.
 */

import { PrismaClient } from '@prisma/client'
import { getResolvedDraftPoolForLeague } from '../lib/draft-room/getResolvedDraftPoolForLeague'
import type { NormalizedDraftEntry } from '../lib/draft-sports-models/types'
import { classifyAvatarSource, type AvatarSource } from '../lib/draft-room/classify-avatar-source'
import {
  canonicalName as sharedCanonicalName,
  canonicalPosition as sharedCanonicalPosition,
  canonicalTeam as sharedCanonicalTeam,
} from '../lib/draft-room/player-canonical-identity'

const prisma = new PrismaClient()

interface Args {
  leagueId: string
  sport: string
  season?: number
  samples: number
  names: string[]
  json: boolean
  limit: number
}

const DEFAULT_NAMES = [
  'Russell Wilson',
  'Marvin Harrison Jr.',
  "De'Von Achane",
  "Ja'Marr Chase",
  'A.J. Brown',
  'Saquon Barkley',
  'Ashton Jeanty',
]

function parseArgs(argv: string[]): Args {
  const out: Args = {
    leagueId: '',
    sport: 'NFL',
    samples: 20,
    names: DEFAULT_NAMES,
    json: false,
    limit: 500,
  }
  for (const raw of argv) {
    if (raw.startsWith('--league=')) out.leagueId = raw.slice('--league='.length)
    else if (raw.startsWith('--leagueId=')) out.leagueId = raw.slice('--leagueId='.length)
    else if (raw.startsWith('--sport=')) out.sport = raw.slice('--sport='.length).toUpperCase()
    else if (raw.startsWith('--season=')) {
      const n = Number.parseInt(raw.slice('--season='.length), 10)
      if (Number.isFinite(n)) out.season = n
    } else if (raw.startsWith('--samples=')) {
      const n = Number.parseInt(raw.slice('--samples='.length), 10)
      if (Number.isFinite(n) && n > 0) out.samples = Math.min(50, n)
    } else if (raw.startsWith('--names=')) {
      const list = raw
        .slice('--names='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (list.length) out.names = list
    } else if (raw === '--json') out.json = true
    else if (raw.startsWith('--limit=')) {
      const n = Number.parseInt(raw.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(1000, n)
    }
  }
  return out
}

// Re-export from the shared module so existing test imports continue to work.
const canonicalName = sharedCanonicalName
const canonicalPosition = sharedCanonicalPosition
const canonicalTeam = sharedCanonicalTeam

interface IdentityGroup {
  key: string
  rows: Array<{
    name: string
    position: string
    team: string | null
    sleeperId: string | null
    playerId: string | null
    adp: number | null
    headshotUrl: string | null
    avatarSource: AvatarSource
    isRookie: boolean | undefined
    yearsExp: number | null | undefined
  }>
}

interface AuditCounters {
  totalRows: number
  uniqueByCanonicalNamePosTeam: number
  duplicateGroupsByCanonicalNamePosTeam: number
  duplicateGroupsByCanonicalNamePos: number
  duplicateGroupsBySleeperId: number
  rowsMissingName: number
  rowsMissingPosition: number
  rowsMissingTeam: number
  rowsMissingAdp: number
  rowsAdpOver400: number
  rowsMissingHeadshot: number
  rowsAvatarTeamLogo: number
  rowsAvatarSynthesized: number
  rowsAvatarHeadshot: number
  rookies: number
  defRows: number
  rowsMissingPlayerId: number
  rowsMissingSleeperId: number
}

function ds(s: string | null | undefined): string {
  return s == null || s === '' ? '—' : s
}

function emitText(report: AuditReport): void {
  const c = report.counters
  console.log('')
  console.log('───────────────────────────────────────────────────────────────')
  console.log(' Player Pool Identity Audit')
  console.log('───────────────────────────────────────────────────────────────')
  console.log(` League : ${report.leagueId}`)
  console.log(` Sport  : ${report.sport}`)
  console.log('')
  console.log(' Counts')
  console.log(' ──────')
  console.log(`   total rows ............................... ${c.totalRows}`)
  console.log(`   unique by canonicalName+pos+team ......... ${c.uniqueByCanonicalNamePosTeam}`)
  console.log(`   duplicate groups (canonicalName+pos+team)  ${c.duplicateGroupsByCanonicalNamePosTeam}`)
  console.log(`   duplicate groups (canonicalName+pos)       ${c.duplicateGroupsByCanonicalNamePos}`)
  console.log(`   duplicate groups (sleeperId)               ${c.duplicateGroupsBySleeperId}`)
  console.log('')
  console.log(' Field Quality')
  console.log(' ─────────────')
  console.log(`   missing name ............................. ${c.rowsMissingName}`)
  console.log(`   missing position ......................... ${c.rowsMissingPosition}`)
  console.log(`   missing team ............................. ${c.rowsMissingTeam}`)
  console.log(`   missing playerId ......................... ${c.rowsMissingPlayerId}`)
  console.log(`   missing sleeperId ........................ ${c.rowsMissingSleeperId}`)
  console.log(`   missing ADP .............................. ${c.rowsMissingAdp}`)
  console.log(`   ADP > 400 (suspicious) ................... ${c.rowsAdpOver400}`)
  console.log('')
  console.log(' Image Quality')
  console.log(' ─────────────')
  console.log(`   missing headshot ......................... ${c.rowsMissingHeadshot}`)
  console.log(`   classified as headshot ................... ${c.rowsAvatarHeadshot}`)
  console.log(`   classified as team_logo_badge_only ....... ${c.rowsAvatarTeamLogo}`)
  console.log(`   classified as synthesized (data: URI) .... ${c.rowsAvatarSynthesized}`)
  console.log('')
  console.log(' Roster Status')
  console.log(' ─────────────')
  console.log(`   rookies (yearsExp=0 or isRookie) ......... ${c.rookies}`)
  console.log(`   DEF rows ................................. ${c.defRows}`)

  if (report.duplicateGroupsByCanonicalNamePosTeam.length > 0) {
    console.log('')
    console.log(' Duplicates (same canonicalName + position + team)')
    console.log(' ────────────────────────────────────────────────')
    for (const group of report.duplicateGroupsByCanonicalNamePosTeam.slice(0, 10)) {
      console.log(`   [${group.key}]  ×${group.rows.length}`)
      for (const r of group.rows) {
        console.log(
          `     - ${r.name}  ${ds(r.position)}/${ds(r.team)}  sleeper=${ds(r.sleeperId)}  pid=${ds(r.playerId)}  adp=${ds(r.adp == null ? null : String(r.adp))}  img=${r.avatarSource}`,
        )
      }
    }
  }

  if (report.duplicateGroupsBySleeperId.length > 0) {
    console.log('')
    console.log(' Duplicates (same sleeperId)')
    console.log(' ───────────────────────────')
    for (const group of report.duplicateGroupsBySleeperId.slice(0, 10)) {
      console.log(`   [sleeperId=${group.key}]  ×${group.rows.length}`)
      for (const r of group.rows) {
        console.log(
          `     - ${r.name}  ${ds(r.position)}/${ds(r.team)}  pid=${ds(r.playerId)}  adp=${ds(r.adp == null ? null : String(r.adp))}`,
        )
      }
    }
  }

  if (report.namedSamples.length > 0) {
    console.log('')
    console.log(' Named samples (full identity dump)')
    console.log(' ──────────────────────────────────')
    for (const sample of report.namedSamples) {
      console.log(`   "${sample.queryName}"  →  ${sample.matches.length} match(es)`)
      for (const r of sample.matches) {
        const url = r.headshotUrl
        const urlPreview = url ? (url.length > 100 ? url.slice(0, 100) + '…' : url) : '—'
        console.log(
          `     • ${r.name}  ${ds(r.position)}/${ds(r.team)}  sleeper=${ds(r.sleeperId)}  pid=${ds(r.playerId)}`,
        )
        console.log(
          `         adp=${ds(r.adp == null ? null : String(r.adp))}  rookie=${r.isRookie ? 'Y' : 'N'}  yearsExp=${ds(r.yearsExp == null ? null : String(r.yearsExp))}  img=${r.avatarSource}`,
        )
        console.log(`         url=${urlPreview}`)
      }
    }
  }

  console.log('')
}

interface AuditReport {
  leagueId: string
  sport: string
  counters: AuditCounters
  duplicateGroupsByCanonicalNamePosTeam: IdentityGroup[]
  duplicateGroupsByCanonicalNamePos: IdentityGroup[]
  duplicateGroupsBySleeperId: IdentityGroup[]
  namedSamples: Array<{
    queryName: string
    matches: IdentityGroup['rows']
  }>
}

function looksLikeSleeperId(v: string | null | undefined): boolean {
  const s = String(v ?? '').trim()
  return /^\d{3,}$/.test(s)
}

function classifyEntry(entry: NormalizedDraftEntry): IdentityGroup['rows'][number] {
  const headshotUrl = entry.display?.assets?.headshotUrl ?? null
  const avatarSource = classifyAvatarSource(headshotUrl)
  // The resolver puts numeric Sleeper IDs on `.playerId` when the typed
  // `.sleeperId` is absent (NormalizedDraftEntry type doesn't declare sleeperId).
  // Treat playerId-that-looks-like-a-Sleeper-ID as a sleeperId for audit purposes.
  const rawSleeperId = (entry as { sleeperId?: string | null }).sleeperId ?? null
  const playerId = entry.playerId ?? null
  const effectiveSleeperId =
    rawSleeperId ?? (looksLikeSleeperId(playerId) ? playerId : null)
  return {
    name: entry.name,
    position: entry.position ?? '',
    team: entry.team ?? null,
    sleeperId: effectiveSleeperId,
    playerId,
    adp: entry.adp ?? null,
    headshotUrl,
    avatarSource,
    isRookie: entry.isRookie,
    yearsExp: entry.yearsExp ?? null,
  }
}

async function audit(args: Args): Promise<AuditReport> {
  if (args.sport !== 'NFL') {
    throw new Error(`Currently NFL-only. Got sport=${args.sport}`)
  }

  const result = await getResolvedDraftPoolForLeague(args.leagueId, {
    limit: args.limit,
  })
  const entries = (result?.entries ?? []) as NormalizedDraftEntry[]

  const rows = entries.map(classifyEntry)

  // Group by canonicalName+pos+team
  const groupNamePosTeam = new Map<string, IdentityGroup>()
  // Group by canonicalName+pos
  const groupNamePos = new Map<string, IdentityGroup>()
  // Group by sleeperId (only when present)
  const groupSleeperId = new Map<string, IdentityGroup>()

  for (const r of rows) {
    const cn = canonicalName(r.name)
    const cp = canonicalPosition(r.position)
    const ct = canonicalTeam(r.team)

    const k1 = `${cn}|${cp}|${ct}`
    const k2 = `${cn}|${cp}`
    const g1 = groupNamePosTeam.get(k1) ?? { key: k1, rows: [] }
    g1.rows.push(r)
    groupNamePosTeam.set(k1, g1)

    const g2 = groupNamePos.get(k2) ?? { key: k2, rows: [] }
    g2.rows.push(r)
    groupNamePos.set(k2, g2)

    if (r.sleeperId) {
      const k3 = r.sleeperId
      const g3 = groupSleeperId.get(k3) ?? { key: k3, rows: [] }
      g3.rows.push(r)
      groupSleeperId.set(k3, g3)
    }
  }

  const dupNamePosTeam = Array.from(groupNamePosTeam.values()).filter((g) => g.rows.length > 1)
  const dupNamePos = Array.from(groupNamePos.values()).filter((g) => g.rows.length > 1)
  const dupSleeperId = Array.from(groupSleeperId.values()).filter((g) => g.rows.length > 1)

  const counters: AuditCounters = {
    totalRows: rows.length,
    uniqueByCanonicalNamePosTeam: groupNamePosTeam.size,
    duplicateGroupsByCanonicalNamePosTeam: dupNamePosTeam.length,
    duplicateGroupsByCanonicalNamePos: dupNamePos.length,
    duplicateGroupsBySleeperId: dupSleeperId.length,
    rowsMissingName: rows.filter((r) => !r.name || r.name.trim() === '').length,
    rowsMissingPosition: rows.filter((r) => !r.position || r.position.trim() === '').length,
    rowsMissingTeam: rows.filter(
      (r) => (!r.team || r.team.trim() === '') && canonicalPosition(r.position) !== 'DEF',
    ).length,
    rowsMissingPlayerId: rows.filter((r) => !r.playerId).length,
    rowsMissingSleeperId: rows.filter((r) => !r.sleeperId).length,
    rowsMissingAdp: rows.filter((r) => r.adp == null).length,
    rowsAdpOver400: rows.filter((r) => r.adp != null && r.adp > 400).length,
    rowsMissingHeadshot: rows.filter((r) => r.headshotUrl == null).length,
    rowsAvatarTeamLogo: rows.filter(
      (r) => r.avatarSource === 'team_logo_badge_only' && canonicalPosition(r.position) !== 'DEF',
    ).length,
    rowsAvatarSynthesized: rows.filter((r) => r.avatarSource === 'synthesized').length,
    rowsAvatarHeadshot: rows.filter((r) => r.avatarSource === 'headshot').length,
    rookies: rows.filter((r) => r.isRookie === true || r.yearsExp === 0).length,
    defRows: rows.filter((r) => canonicalPosition(r.position) === 'DEF').length,
  }

  // Named samples — show all rows whose canonicalName starts with the query
  const namedSamples: AuditReport['namedSamples'] = []
  for (const queryName of args.names) {
    const cnQ = canonicalName(queryName)
    const matches = rows.filter((r) => {
      const cn = canonicalName(r.name)
      return cn === cnQ || cn.startsWith(cnQ) || cnQ.startsWith(cn)
    })
    namedSamples.push({ queryName, matches: matches.slice(0, args.samples) })
  }

  return {
    leagueId: args.leagueId,
    sport: args.sport,
    counters,
    duplicateGroupsByCanonicalNamePosTeam: dupNamePosTeam,
    duplicateGroupsByCanonicalNamePos: dupNamePos,
    duplicateGroupsBySleeperId: dupSleeperId,
    namedSamples,
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.leagueId) {
    console.error('Usage: npx tsx scripts/audit-draft-player-pool.ts --league=<leagueId>')
    process.exit(2)
  }
  try {
    const report = await audit(args)
    if (args.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n')
    } else {
      emitText(report)
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[audit-draft-player-pool] fatal:', err)
    process.exit(1)
  })
}

export { canonicalName, canonicalPosition, canonicalTeam, audit }
