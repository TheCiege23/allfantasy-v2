/**
 * Slice D.1 — Player asset + stats audit.
 *
 * Diagnoses whether the missing player headshots and empty stat cells in the draft
 * room's player pool are a DATA problem (ingestion / image_url / RI stats) or a UI
 * problem (rendering pipeline / mapping).
 *
 * USAGE
 *   npx tsx scripts/audit-draft-player-assets.ts --league=<leagueId>
 *
 * Optional:
 *   --json              Output JSON only (no readable summary)
 *   --limit=N           Override resolved pool limit (default 300, max 500)
 *
 * Reads only. Never writes to the database.
 */

/**
 * `server-only` is stubbed via scripts/_audit-preload.cjs (loaded with
 * `node --require`) so the resolver chain can run under plain Node + tsx.
 */

import { PrismaClient } from '@prisma/client'
import { getResolvedDraftPoolForLeague } from '../lib/draft-room/getResolvedDraftPoolForLeague'
import type { NormalizedDraftEntry } from '../lib/draft-sports-models/types'
import { classifyAvatarSource, type AvatarSource } from '../lib/draft-room/classify-avatar-source'

const prisma = new PrismaClient()

interface Args {
  leagueId: string
  json: boolean
  limit?: number
  /** When set, also print classified samples of N raw headshot URLs from the resolved pool. */
  samples?: number
}

function parseArgs(argv: string[]): Args {
  const out: Args = { leagueId: '', json: false }
  for (const raw of argv) {
    if (raw.startsWith('--league=')) out.leagueId = raw.slice('--league='.length)
    else if (raw.startsWith('--leagueId=')) out.leagueId = raw.slice('--leagueId='.length)
    else if (raw === '--json') out.json = true
    else if (raw.startsWith('--limit=')) {
      const n = Number.parseInt(raw.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(500, n)
    }
    else if (raw.startsWith('--samples=')) {
      const n = Number.parseInt(raw.slice('--samples='.length), 10)
      if (Number.isFinite(n) && n > 0) out.samples = Math.min(50, n)
    }
  }
  return out
}

interface AuditCounters {
  totalPoolEntries: number
  withHeadshotUrl: number
  missingHeadshotUrl: number
  withTeamLogoUrl: number
  missingTeamLogoUrl: number
  withFantasyPpg: number
  missingFantasyPpg: number
  withNflSplits: number
  missingNflSplits: number
  allZeroNflSplits: number
}

interface AuditResult {
  leagueId: string
  sport: string
  rosterConfigurationIncomplete?: boolean
  counters: AuditCounters
  /** E.1: how many pool entries' headshotUrl falls into each classifier bucket. */
  avatarSourceBreakdown: Record<AvatarSource, number>
  /** E.1: when --samples=N is passed, the first N raw headshot URLs and their classification. */
  headshotSamples?: Array<{
    name: string
    position: string
    team: string | null
    headshotUrl: string | null
    avatarSource: AvatarSource
  }>
  examples: {
    missingHeadshot: Array<{ name: string; position: string; team: string | null; playerId: string | null }>
    missingStats: Array<{ name: string; position: string; team: string | null; playerId: string | null }>
  }
  sportsPlayerCrossCheck: {
    sampledPlayerIds: number
    matchedSportsPlayerRows: number
    sportsPlayerImageUrlPresent: number
    sportsPlayerImageUrlNull: number
  }
  diagnosis: 'DATA_MISSING_HEADSHOTS' | 'DATA_MISSING_STATS' | 'UI_MAPPING_BUG' | 'MIXED' | 'OK'
  notes: string[]
}

function isAllZero(splits: NormalizedDraftEntry['nflDraftProjectionSplits']): boolean {
  if (!splits) return false
  const cells = [
    splits.projectedPoints,
    splits.projectedPointsPerGame,
    splits.rushing?.att,
    splits.rushing?.yds,
    splits.rushing?.td,
    splits.receiving?.rec,
    splits.receiving?.yds,
    splits.receiving?.td,
    splits.passing?.cmp,
    splits.passing?.att,
    splits.passing?.yds,
    splits.passing?.td,
    splits.passing?.int,
  ]
  return cells.every((c) => c == null || c === 0)
}

async function audit(args: Args): Promise<AuditResult> {
  const { leagueId } = args
  if (!leagueId) {
    throw new Error('Missing --league=<leagueId>')
  }

  const result = await getResolvedDraftPoolForLeague(leagueId, args.limit ? { limit: args.limit } : {})

  const counters: AuditCounters = {
    totalPoolEntries: result.entries.length,
    withHeadshotUrl: 0,
    missingHeadshotUrl: 0,
    withTeamLogoUrl: 0,
    missingTeamLogoUrl: 0,
    withFantasyPpg: 0,
    missingFantasyPpg: 0,
    withNflSplits: 0,
    missingNflSplits: 0,
    allZeroNflSplits: 0,
  }

  const missingHeadshot: AuditResult['examples']['missingHeadshot'] = []
  const missingStats: AuditResult['examples']['missingStats'] = []
  const avatarSourceBreakdown: Record<AvatarSource, number> = {
    headshot: 0,
    team_logo_badge_only: 0,
    synthesized: 0,
    null: 0,
  }
  const headshotSamples: NonNullable<AuditResult['headshotSamples']> = []

  for (const e of result.entries) {
    const head = e.display?.assets?.headshotUrl ?? null
    const logo = e.display?.assets?.teamLogoUrl ?? null
    const avatarSource = classifyAvatarSource(head)
    avatarSourceBreakdown[avatarSource] += 1
    if (args.samples && headshotSamples.length < args.samples) {
      headshotSamples.push({
        name: e.name,
        position: e.position,
        team: e.team,
        headshotUrl: head,
        avatarSource,
      })
    }
    if (head) counters.withHeadshotUrl += 1
    else {
      counters.missingHeadshotUrl += 1
      if (missingHeadshot.length < 25) {
        missingHeadshot.push({
          name: e.name,
          position: e.position,
          team: e.team,
          playerId: e.playerId ?? e.display?.playerId ?? null,
        })
      }
    }
    if (logo) counters.withTeamLogoUrl += 1
    else counters.missingTeamLogoUrl += 1

    const ppg = e.display?.stats?.fantasyPointsPerGame
    if (typeof ppg === 'number' && ppg > 0) counters.withFantasyPpg += 1
    else counters.missingFantasyPpg += 1

    if (e.nflDraftProjectionSplits) {
      counters.withNflSplits += 1
      if (isAllZero(e.nflDraftProjectionSplits)) counters.allZeroNflSplits += 1
    } else {
      counters.missingNflSplits += 1
      if (missingStats.length < 25) {
        missingStats.push({
          name: e.name,
          position: e.position,
          team: e.team,
          playerId: e.playerId ?? e.display?.playerId ?? null,
        })
      }
    }
  }

  // Cross-check SportsPlayer rows directly. Use external ids when present;
  // otherwise fall back to (sport, name, position).
  const sport = String(result.sport || 'NFL')
  const sampleIds = result.entries
    .map((e) => String(e.playerId ?? e.display?.playerId ?? '').trim())
    .filter((id) => id.length > 0)
    .slice(0, 100)

  let matchedSportsPlayerRows = 0
  let sportsPlayerImageUrlPresent = 0
  let sportsPlayerImageUrlNull = 0
  if (sampleIds.length > 0) {
    const rows = await prisma.sportsPlayer.findMany({
      where: { sport: sport as any, externalId: { in: sampleIds } },
      select: { externalId: true, imageUrl: true },
    })
    matchedSportsPlayerRows = rows.length
    for (const r of rows) {
      if (r.imageUrl && r.imageUrl.length > 0) sportsPlayerImageUrlPresent += 1
      else sportsPlayerImageUrlNull += 1
    }
  }

  const notes: string[] = []
  let diagnosis: AuditResult['diagnosis'] = 'OK'
  const headshotMissingPct = counters.totalPoolEntries
    ? counters.missingHeadshotUrl / counters.totalPoolEntries
    : 0
  const statsMissingPct = counters.totalPoolEntries
    ? counters.missingNflSplits / counters.totalPoolEntries
    : 0

  const sportsPlayerNullPct =
    matchedSportsPlayerRows > 0 ? sportsPlayerImageUrlNull / matchedSportsPlayerRows : 0

  if (headshotMissingPct >= 0.5 && sportsPlayerNullPct >= 0.5) {
    notes.push(
      `${(sportsPlayerNullPct * 100).toFixed(0)}% of sampled SportsPlayer rows have NULL image_url — ingestion did not populate headshots.`,
    )
    diagnosis = 'DATA_MISSING_HEADSHOTS'
  } else if (headshotMissingPct >= 0.5 && sportsPlayerNullPct < 0.5) {
    notes.push(
      `${(headshotMissingPct * 100).toFixed(0)}% of pool rows are missing headshotUrl, but ${(
        (1 - sportsPlayerNullPct) * 100
      ).toFixed(0)}% of matched SportsPlayer rows have an image_url. UI mapping is dropping it.`,
    )
    diagnosis = 'UI_MAPPING_BUG'
  }

  if (sport === 'NFL' && statsMissingPct >= 0.5) {
    notes.push(
      `${(statsMissingPct * 100).toFixed(0)}% of NFL pool rows are missing nflDraftProjectionSplits — Rolling Insights stats not attached.`,
    )
    diagnosis = diagnosis === 'OK' ? 'DATA_MISSING_STATS' : diagnosis === 'DATA_MISSING_HEADSHOTS' ? 'MIXED' : diagnosis
  }
  if (counters.allZeroNflSplits > 0 && counters.withNflSplits > 0) {
    notes.push(
      `${counters.allZeroNflSplits}/${counters.withNflSplits} NFL splits objects are present but all-zero — split builder is firing but stats are absent.`,
    )
  }
  if (sport === 'NFL' && diagnosis === 'OK' && headshotMissingPct < 0.5 && statsMissingPct < 0.5) {
    notes.push('Pool data looks healthy. Visual gap is most likely UI layout/density.')
  }
  if (sport !== 'NFL') {
    notes.push(`Sport is ${sport}; nflDraftProjectionSplits is intentionally null for non-NFL sports.`)
  }
  if (matchedSportsPlayerRows === 0 && sampleIds.length > 0) {
    notes.push(
      `0 SportsPlayer rows matched the ${sampleIds.length} sampled external ids — id alignment between pool and SportsPlayer may be broken.`,
    )
  }

  // E.1: surface the synth/team-logo proportion as a note so the headline is visible
  // without needing to read the breakdown.
  const synthCount = avatarSourceBreakdown.synthesized + avatarSourceBreakdown.team_logo_badge_only
  if (counters.totalPoolEntries > 0 && synthCount / counters.totalPoolEntries >= 0.25) {
    notes.push(
      `${synthCount}/${counters.totalPoolEntries} pool rows have a placeholder headshotUrl (data: URI or team-logo path). PlayerAvatar's classifier rejects these and falls back to initials.`,
    )
  }

  return {
    leagueId,
    sport,
    rosterConfigurationIncomplete: result.rosterConfigurationIncomplete,
    counters,
    avatarSourceBreakdown,
    headshotSamples: args.samples ? headshotSamples : undefined,
    examples: { missingHeadshot, missingStats },
    sportsPlayerCrossCheck: {
      sampledPlayerIds: sampleIds.length,
      matchedSportsPlayerRows,
      sportsPlayerImageUrlPresent,
      sportsPlayerImageUrlNull,
    },
    diagnosis,
    notes,
  }
}

function pct(part: number, whole: number): string {
  if (!whole) return '—'
  return `${((part / whole) * 100).toFixed(1)}%`
}

function printSummary(r: AuditResult): void {
  const c = r.counters
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Slice D.1 — Player Asset & Stats Audit`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`League:                ${r.leagueId}`)
  console.log(`Sport:                 ${r.sport}`)
  if (r.rosterConfigurationIncomplete) {
    console.log(`Roster config:         INCOMPLETE — pool was not resolved.`)
  }
  console.log('')
  console.log(`Pool entries:          ${c.totalPoolEntries}`)
  console.log(`  with headshot URL:   ${c.withHeadshotUrl}  (${pct(c.withHeadshotUrl, c.totalPoolEntries)})`)
  console.log(`  missing headshot:    ${c.missingHeadshotUrl}  (${pct(c.missingHeadshotUrl, c.totalPoolEntries)})`)
  console.log(`  with team logo:      ${c.withTeamLogoUrl}  (${pct(c.withTeamLogoUrl, c.totalPoolEntries)})`)
  console.log(`  missing team logo:   ${c.missingTeamLogoUrl}  (${pct(c.missingTeamLogoUrl, c.totalPoolEntries)})`)
  console.log(`  with fantasy ppg:    ${c.withFantasyPpg}  (${pct(c.withFantasyPpg, c.totalPoolEntries)})`)
  console.log(`  missing fantasy ppg: ${c.missingFantasyPpg}  (${pct(c.missingFantasyPpg, c.totalPoolEntries)})`)
  if (r.sport === 'NFL') {
    console.log(`  with NFL splits:     ${c.withNflSplits}  (${pct(c.withNflSplits, c.totalPoolEntries)})`)
    console.log(`  missing NFL splits:  ${c.missingNflSplits}  (${pct(c.missingNflSplits, c.totalPoolEntries)})`)
    console.log(`  all-zero splits:     ${c.allZeroNflSplits}  (${pct(c.allZeroNflSplits, c.totalPoolEntries)})`)
  }
  console.log('')
  console.log(`SportsPlayer cross-check:`)
  console.log(`  sampled ids:                 ${r.sportsPlayerCrossCheck.sampledPlayerIds}`)
  console.log(`  matched SportsPlayer rows:   ${r.sportsPlayerCrossCheck.matchedSportsPlayerRows}`)
  console.log(`  image_url present (DB):      ${r.sportsPlayerCrossCheck.sportsPlayerImageUrlPresent}`)
  console.log(`  image_url null    (DB):      ${r.sportsPlayerCrossCheck.sportsPlayerImageUrlNull}`)
  console.log('')
  console.log(`Avatar source classification (E.1):`)
  console.log(`  real headshot URL:           ${r.avatarSourceBreakdown.headshot}  (${pct(r.avatarSourceBreakdown.headshot, c.totalPoolEntries)})`)
  console.log(`  synthesized data URI:        ${r.avatarSourceBreakdown.synthesized}  (${pct(r.avatarSourceBreakdown.synthesized, c.totalPoolEntries)})`)
  console.log(`  team logo path (badge only): ${r.avatarSourceBreakdown.team_logo_badge_only}  (${pct(r.avatarSourceBreakdown.team_logo_badge_only, c.totalPoolEntries)})`)
  console.log(`  null / not provided:         ${r.avatarSourceBreakdown.null}  (${pct(r.avatarSourceBreakdown.null, c.totalPoolEntries)})`)
  console.log('')
  if (r.headshotSamples && r.headshotSamples.length > 0) {
    console.log(`Headshot URL samples (--samples=${r.headshotSamples.length}):`)
    for (const s of r.headshotSamples) {
      const url = s.headshotUrl ? (s.headshotUrl.length > 110 ? s.headshotUrl.slice(0, 107) + '...' : s.headshotUrl) : '—'
      console.log(`  [${s.avatarSource.padEnd(20)}] ${s.name.padEnd(28)} ${s.position.padEnd(4)} ${(s.team ?? '—').padEnd(4)} ${url}`)
    }
    console.log('')
  }
  if (r.examples.missingHeadshot.length > 0) {
    console.log(`Missing headshot examples (top ${r.examples.missingHeadshot.length}):`)
    for (const p of r.examples.missingHeadshot) {
      console.log(`  - ${p.name.padEnd(28)} ${p.position.padEnd(4)} ${(p.team ?? '—').padEnd(4)} id=${p.playerId ?? '—'}`)
    }
    console.log('')
  }
  if (r.examples.missingStats.length > 0) {
    console.log(`Missing stats/splits examples (top ${r.examples.missingStats.length}):`)
    for (const p of r.examples.missingStats) {
      console.log(`  - ${p.name.padEnd(28)} ${p.position.padEnd(4)} ${(p.team ?? '—').padEnd(4)} id=${p.playerId ?? '—'}`)
    }
    console.log('')
  }
  console.log(`Diagnosis: ${r.diagnosis}`)
  if (r.notes.length > 0) {
    for (const n of r.notes) console.log(`  • ${n}`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = await audit(args)
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else {
    printSummary(result)
    process.stdout.write('JSON_OUTPUT_BEGIN\n')
    process.stdout.write(JSON.stringify(result) + '\n')
    process.stdout.write('JSON_OUTPUT_END\n')
  }
}

main()
  .catch((err) => {
    console.error('[audit-draft-player-assets] FAILED:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
