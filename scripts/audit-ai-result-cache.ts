#!/usr/bin/env tsx
/**
 * scripts/audit-ai-result-cache.ts
 *
 * Audit the AiResult table across all specialty/commissioner AI features.
 * Reports per-feature: total rows, live rows, stale rows, hit-rate proxy,
 * newest/oldest entry, and flags features with zero cached entries.
 *
 * Usage: npm run ai-result-cache:audit
 */

import { prisma } from '../lib/prisma'

const TRACKED_FEATURES = [
  'player-card-analytics',
  'commissioner-question',
  'power-rankings',
  'waiver-recs',
  'matchup-preview',
  'commish-note',
  'rankings-power-scores',
  'redraft-trade-analysis',
  'mock-draft-ai-pick-insight',
] as const

type Feature = (typeof TRACKED_FEATURES)[number]

interface FeatureAudit {
  feature: Feature
  total: number
  live: number
  stale: number
  newestAgeMinutes: number | null
  oldestAgeHours: number | null
  oldestScopeId: string | null
  newestScopeId: string | null
}

async function auditFeature(feature: Feature, now: Date): Promise<FeatureAudit> {
  const total = await prisma.aiResult.count({ where: { feature } })
  const live = await prisma.aiResult.count({
    where: {
      feature,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  })
  const stale = total - live

  let newestAgeMinutes: number | null = null
  let oldestAgeHours: number | null = null
  let newestScopeId: string | null = null
  let oldestScopeId: string | null = null

  if (total > 0) {
    const newest = await prisma.aiResult.findFirst({
      where: { feature },
      orderBy: { syncedAt: 'desc' },
      select: { scopeId: true, syncedAt: true },
    })
    const oldest = await prisma.aiResult.findFirst({
      where: { feature },
      orderBy: { syncedAt: 'asc' },
      select: { scopeId: true, syncedAt: true },
    })
    if (newest) {
      newestAgeMinutes = Math.round((now.getTime() - newest.syncedAt.getTime()) / 60_000)
      newestScopeId = newest.scopeId
    }
    if (oldest) {
      oldestAgeHours = parseFloat(((now.getTime() - oldest.syncedAt.getTime()) / 3_600_000).toFixed(1))
      oldestScopeId = oldest.scopeId
    }
  }

  return { feature, total, live, stale, newestAgeMinutes, oldestAgeHours, newestScopeId, oldestScopeId }
}

async function main() {
  const now = new Date()

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║  AI RESULT CACHE AUDIT')
  console.log(`║  ${now.toISOString()}`)
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  const audits: FeatureAudit[] = []
  for (const feature of TRACKED_FEATURES) {
    const audit = await auditFeature(feature, now)
    audits.push(audit)
  }

  // ── per-feature table ─────────────────────────────────────────────────────
  console.log('  Feature                    Total  Live  Stale  Newest        Oldest')
  console.log('  ─────────────────────────  ─────  ────  ─────  ────────────  ────────────')
  for (const a of audits) {
    const newestStr = a.newestAgeMinutes !== null ? `${a.newestAgeMinutes}m ago` : '—'
    const oldestStr = a.oldestAgeHours !== null ? `${a.oldestAgeHours}h ago` : '—'
    const totalPad = String(a.total).padStart(5)
    const livePad  = String(a.live).padStart(4)
    const stalePad = String(a.stale).padStart(5)
    console.log(
      `  ${a.feature.padEnd(25)}  ${totalPad}  ${livePad}  ${stalePad}  ${newestStr.padEnd(12)}  ${oldestStr}`,
    )
  }

  // ── global totals ─────────────────────────────────────────────────────────
  const totalRows = await prisma.aiResult.count()
  const liveRows = await prisma.aiResult.count({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
  })
  const staleRows = totalRows - liveRows

  console.log('\n  ─────────────────────────────────────────────────────────────')
  console.log(`  Total AiResult rows (all features): ${totalRows}`)
  console.log(`  Live rows (no expiresAt or future): ${liveRows}`)
  console.log(`  Stale rows (past expiresAt):        ${staleRows}`)

  // ── health flags ──────────────────────────────────────────────────────────
  const uncached = audits.filter((a) => a.total === 0)
  const staleOnly = audits.filter((a) => a.total > 0 && a.live === 0)
  const healthy  = audits.filter((a) => a.live > 0)

  console.log('\n  ── Health Flags ──────────────────────────────────────────────')
  if (uncached.length === 0 && staleOnly.length === 0) {
    console.log('  ✔ All tracked features have live cached entries.')
  } else {
    if (uncached.length > 0) {
      console.log(`  ⚠ Features with ZERO cached entries (never warmed):`)
      for (const a of uncached) console.log(`      - ${a.feature}`)
    }
    if (staleOnly.length > 0) {
      console.log(`  ⚠ Features with only stale entries (TTL expired, not yet repopulated):`)
      for (const a of staleOnly) console.log(`      - ${a.feature}`)
    }
    if (healthy.length > 0) {
      console.log(`  ✔ Features with live cache: ${healthy.map((a) => a.feature).join(', ')}`)
    }
  }

  // ── feature distribution (all features in DB, not just tracked) ───────────
  const allFeatures = await prisma.$queryRaw<Array<{ feature: string; cnt: bigint }>>`
    SELECT feature, COUNT(*) AS cnt FROM ai_results GROUP BY feature ORDER BY cnt DESC
  `
  if (allFeatures.length > 0) {
    const untrackedInDb = allFeatures.filter(
      (f) => !(TRACKED_FEATURES as readonly string[]).includes(f.feature),
    )
    if (untrackedInDb.length > 0) {
      console.log('\n  ── Untracked features with rows in ai_results ────────────────')
      for (const f of untrackedInDb) {
        console.log(`      ${f.feature}: ${f.cnt}`)
      }
    }
  }

  console.log('\n  Recommended next steps:')
  if (uncached.length > 0 || staleOnly.length > 0) {
    console.log('    Stale/empty features will self-populate on next user request.')
    console.log('    To force warm a feature, trigger the corresponding route with a real leagueId.')
  } else {
    console.log('    All tracked features have live entries — no action needed.')
  }

  console.log('\n╚══════════════════════════════════════════════════════════════╝\n')
}

main()
  .catch((e) => {
    console.error('[audit-ai-result-cache] Fatal:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
