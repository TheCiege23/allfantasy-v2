/**
 * Backfill SportsPlayerRecord media fields from DraftPoolCache display assets.
 *
 * Purpose:
 * - Use already-resolved DraftPoolCache media (headshot/team logo) as source of truth.
 * - Populate missing SportsPlayerRecord.headshotUrl / logoUrl only.
 * - Never fetch external images. Never change UI visuals.
 *
 * Usage:
 *   npx tsx scripts/backfill-sports-player-record-media-from-draft-pool-cache.ts --leagueId=<id>
 *   npx tsx scripts/backfill-sports-player-record-media-from-draft-pool-cache.ts --leagueId=<id> --json
 *   npx tsx scripts/backfill-sports-player-record-media-from-draft-pool-cache.ts --leagueId=<id> --apply
 */

import { PrismaClient } from '@prisma/client'
import { canonicalName, canonicalPosition, canonicalTeam } from '../lib/draft-room/player-canonical-identity'

const prisma = new PrismaClient()

type Args = {
  leagueId: string
  apply: boolean
  json: boolean
  sport: string
  limit: number
}

type DraftEntry = Record<string, unknown>

type MediaCandidate = {
  key: string
  name: string
  position: string
  team: string
  headshotUrl: string | null
  logoUrl: string | null
}

type UpdatePlan = {
  id: string
  name: string
  position: string
  team: string
  setHeadshotUrl: string | null
  setLogoUrl: string | null
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    leagueId: '',
    apply: false,
    json: false,
    sport: 'NFL',
    limit: 5000,
  }

  for (const raw of argv) {
    if (raw.startsWith('--league=')) out.leagueId = raw.slice('--league='.length)
    else if (raw.startsWith('--leagueId=')) out.leagueId = raw.slice('--leagueId='.length)
    else if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
    else if (raw.startsWith('--sport=')) out.sport = String(raw.slice('--sport='.length) || 'NFL').toUpperCase()
    else if (raw.startsWith('--limit=')) {
      const n = Number.parseInt(raw.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(20000, n)
    }
  }

  return out
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

function readPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function asEntries(payload: unknown): DraftEntry[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as { entries?: unknown }
  const list = Array.isArray(root.entries) ? root.entries : []
  return list.filter((e): e is DraftEntry => Boolean(e && typeof e === 'object'))
}

function isPlayerEntry(entry: DraftEntry): boolean {
  const assetType = getString(entry.assetType)
  return !assetType || assetType === 'player'
}

function isValidHttpUrl(url: string | null | undefined): boolean {
  const v = String(url ?? '').trim()
  return /^https?:\/\//i.test(v)
}

function isLikelyPlaceholderHeadshot(url: string | null | undefined): boolean {
  const v = String(url ?? '').trim().toLowerCase()
  if (!v) return true
  if (v.startsWith('data:image/')) return true
  return false
}

function isLikelyPlaceholderLogo(url: string | null | undefined): boolean {
  const v = String(url ?? '').trim().toLowerCase()
  if (!v) return true
  if (v.startsWith('data:image/')) return true
  return false
}

function isNoTeam(team: string | null | undefined): boolean {
  const t = canonicalTeam(team)
  return t === '' || t === 'FA' || t === 'F/A' || t === 'NONE' || t === 'N/A' || t === 'NA' || t === 'UNKNOWN'
}

function strictKey(name: string, position: string, team: string | null | undefined): string {
  return `${canonicalName(name)}|${canonicalPosition(position)}|${canonicalTeam(team)}`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.leagueId) throw new Error('Missing --leagueId=<leagueId>')

  const latestCache = await (prisma as any).draftPoolCache.findFirst({
    where: {
      leagueId: args.leagueId,
      cacheKey: { contains: 'draft_pool:' },
    },
    select: {
      id: true,
      cacheKey: true,
      syncedAt: true,
      payload: true,
    },
    orderBy: { syncedAt: 'desc' },
  })

  if (!latestCache) throw new Error(`No draft pool cache row found for leagueId=${args.leagueId}`)

  const entries = asEntries(latestCache.payload).filter(isPlayerEntry)
  const candidateByKey = new Map<string, MediaCandidate>()
  const ambiguousKeys = new Set<string>()

  for (const entry of entries) {
    const name = getString(entry.name) || getString(readPath(entry, ['display', 'displayName']))
    const position = getString(entry.position) || getString(readPath(entry, ['display', 'metadata', 'position']))
    const team =
      getString(entry.team) ||
      getString(readPath(entry, ['display', 'team', 'abbreviation'])) ||
      getString(readPath(entry, ['display', 'team', 'abbr']))

    if (!name || !position) continue

    const headshotUrl =
      getString(readPath(entry, ['display', 'assets', 'headshotUrl'])) ||
      getString(entry.headshotUrl)

    const logoUrl =
      getString(readPath(entry, ['display', 'assets', 'teamLogoUrl'])) ||
      getString(readPath(entry, ['display', 'team', 'logoUrl'])) ||
      getString(entry.teamLogoUrl)

    const key = strictKey(name, position, team)
    if (!key) continue

    const normalized: MediaCandidate = {
      key,
      name,
      position,
      team: canonicalTeam(team),
      headshotUrl:
        isValidHttpUrl(headshotUrl) && !isLikelyPlaceholderHeadshot(headshotUrl)
          ? String(headshotUrl)
          : null,
      logoUrl:
        isValidHttpUrl(logoUrl) && !isLikelyPlaceholderLogo(logoUrl)
          ? String(logoUrl)
          : null,
    }

    const existing = candidateByKey.get(key)
    if (!existing) {
      candidateByKey.set(key, normalized)
      continue
    }

    // If conflicting media appears for same strict key, mark ambiguous and skip updates.
    const headshotConflict =
      existing.headshotUrl && normalized.headshotUrl && existing.headshotUrl !== normalized.headshotUrl
    const logoConflict = existing.logoUrl && normalized.logoUrl && existing.logoUrl !== normalized.logoUrl

    if (headshotConflict || logoConflict) {
      ambiguousKeys.add(key)
      continue
    }

    candidateByKey.set(key, {
      ...existing,
      headshotUrl: existing.headshotUrl || normalized.headshotUrl,
      logoUrl: existing.logoUrl || normalized.logoUrl,
    })
  }

  const records = await prisma.sportsPlayerRecord.findMany({
    where: { sport: args.sport },
    select: {
      id: true,
      name: true,
      position: true,
      team: true,
      headshotUrl: true,
      logoUrl: true,
    },
    take: args.limit,
  })

  const plans: UpdatePlan[] = []
  let skippedAmbiguous = 0

  for (const row of records) {
    const key = strictKey(row.name, row.position, row.team)
    if (ambiguousKeys.has(key)) {
      skippedAmbiguous += 1
      continue
    }

    const candidate = candidateByKey.get(key)
    if (!candidate) continue

    const setHeadshotUrl = !row.headshotUrl && candidate.headshotUrl ? candidate.headshotUrl : null
    const setLogoUrl =
      !row.logoUrl && candidate.logoUrl && !isNoTeam(row.team)
        ? candidate.logoUrl
        : null

    if (!setHeadshotUrl && !setLogoUrl) continue

    plans.push({
      id: row.id,
      name: row.name,
      position: row.position,
      team: row.team,
      setHeadshotUrl,
      setLogoUrl,
    })
  }

  let applied = 0
  if (args.apply) {
    for (const plan of plans) {
      const data: { headshotUrl?: string; headshotSource?: string; headshotUrlSm?: string; headshotUrlLg?: string; logoUrl?: string } = {}
      if (plan.setHeadshotUrl) {
        data.headshotUrl = plan.setHeadshotUrl
        data.headshotUrlSm = plan.setHeadshotUrl
        data.headshotUrlLg = plan.setHeadshotUrl
        data.headshotSource = 'draft_pool_cache'
      }
      if (plan.setLogoUrl) {
        data.logoUrl = plan.setLogoUrl
      }
      const result = await prisma.sportsPlayerRecord.updateMany({
        where: {
          id: plan.id,
          ...(plan.setHeadshotUrl ? { headshotUrl: null } : {}),
          ...(plan.setLogoUrl ? { logoUrl: null } : {}),
        },
        data,
      })
      if (result.count > 0) applied += 1
    }
  }

  const report = {
    mode: args.apply ? 'apply' : 'dry-run',
    leagueId: args.leagueId,
    sport: args.sport,
    cache: {
      id: latestCache.id,
      cacheKey: latestCache.cacheKey,
      syncedAt: latestCache.syncedAt,
      entries: entries.length,
    },
    candidateKeys: candidateByKey.size,
    ambiguousKeys: ambiguousKeys.size,
    skippedAmbiguous,
    plans: plans.length,
    plansWithHeadshot: plans.filter((p) => Boolean(p.setHeadshotUrl)).length,
    plansWithLogo: plans.filter((p) => Boolean(p.setLogoUrl)).length,
    applied,
    samplePlans: plans.slice(0, 30),
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('============================================================')
    console.log(' SportsPlayerRecord media backfill from DraftPoolCache')
    console.log('============================================================')
    console.log(`mode: ${report.mode}`)
    console.log(`leagueId: ${report.leagueId}`)
    console.log(`sport: ${report.sport}`)
    console.log(`cache syncedAt: ${String(report.cache.syncedAt)}`)
    console.log(`cache entries: ${report.cache.entries}`)
    console.log(`candidate keys: ${report.candidateKeys}`)
    console.log(`ambiguous keys: ${report.ambiguousKeys}`)
    console.log(`skipped ambiguous rows: ${report.skippedAmbiguous}`)
    console.log(`planned updates: ${report.plans}`)
    console.log(`  with headshot: ${report.plansWithHeadshot}`)
    console.log(`  with logo: ${report.plansWithLogo}`)
    if (args.apply) console.log(`applied rows: ${report.applied}`)
    console.log('')
    for (const p of report.samplePlans) {
      console.log(
        `- ${p.name} | ${p.position}/${p.team || 'NA'} | headshot=${p.setHeadshotUrl ? 'yes' : 'no'} | logo=${p.setLogoUrl ? 'yes' : 'no'}`,
      )
    }
  }
}

void main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[backfill-sports-player-record-media-from-draft-pool-cache] failed:', message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
