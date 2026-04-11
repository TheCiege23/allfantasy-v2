/**
 * Backfill ranking-import Sleeper `leagues` rows so they stay out of My Leagues and
 * match the current tagging model (`legacy_summary`, optional `ranking_only`, `settings.rankImportOnly`).
 *
 * ## Case A — safe global (import stats present)
 * Rows where a later sync nulled `leagueVariant` but import_* survived:
 *   - platform = 'sleeper'
 *   - leagueVariant IS NULL
 *   - status IS NOT NULL
 *   - importWins / importLosses / importFinalStanding — at least one set
 * Active hub imports never populate import_*, so this set is ranking data only.
 *
 * Updates: `leagueVariant = 'legacy_summary'` only (preserves Sleeper `status` for diagnostics).
 *
 * ## Case B — user-scoped only (no import stats; old isLegacy processLeague path)
 * Rows that look like full hub sync but were from the buggy ranking import:
 *   - platform = 'sleeper'
 *   - leagueVariant IS NULL
 *   - importWins, importLosses, importFinalStanding all NULL
 *   - status IS NOT NULL
 *   - settings.rankImportOnly is not true
 *
 * Requires `--user-id=<uuid>` and `--apply-case-b`. Updates:
 *   - leagueVariant = 'legacy_summary'
 *   - status = 'ranking_only'
 *   - merge settings with rankImportOnly + backfill metadata
 *
 * Case B can still hide a real hub league if misused — only run for accounts where
 * My Leagues incorrectly listed Sleeper leagues right after a rankings-only import.
 *
 * Usage:
 *   npx tsx scripts/backfill-ranking-import-variant.ts [--dry-run]
 *   npx tsx scripts/backfill-ranking-import-variant.ts --user-id=<uuid> [--dry-run] [--apply-case-b]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseArg(name: string): string | null {
  const prefix = `${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length).trim() || null : null
}

function mergeSettings(
  existing: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
  return { ...base, ...patch }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const applyCaseB = process.argv.includes('--apply-case-b')
  const userIdFilter = parseArg('--user-id')

  // ── Case A ─────────────────────────────────────────────
  const caseA = await prisma.league.findMany({
    where: {
      platform: 'sleeper',
      leagueVariant: null,
      status: { not: null },
      OR: [
        { importWins: { not: null } },
        { importLosses: { not: null } },
        { importFinalStanding: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      season: true,
      status: true,
      importWins: true,
      importLosses: true,
      importFinalStanding: true,
    },
    orderBy: [{ userId: 'asc' }, { season: 'desc' }],
  })

  console.log(
    `[Case A] Found ${caseA.length} ranking-import league(s) with overwritten leagueVariant (import_* present).`,
  )
  if (caseA.length > 0) {
    console.table(caseA)
  }

  if (!dryRun && caseA.length > 0) {
    const ids = caseA.map((r) => r.id)
    const result = await prisma.league.updateMany({
      where: { id: { in: ids } },
      data: { leagueVariant: 'legacy_summary' },
    })
    console.log(`[Case A] Updated ${result.count} league(s) → leagueVariant='legacy_summary'.`)
  } else if (dryRun && caseA.length > 0) {
    console.log('[Case A] Dry run — no changes.')
  }

  // ── Case B ─────────────────────────────────────────────
  if (!userIdFilter) {
    console.log(
      '[Case B] Skipped (pass --user-id=<uuid> to list; add --apply-case-b with --dry-run off to apply).',
    )
    if (dryRun) {
      console.log('Dry run complete.')
    }
    return
  }

  const caseBCandidates = await prisma.league.findMany({
    where: {
      userId: userIdFilter,
      platform: 'sleeper',
      leagueVariant: null,
      importWins: null,
      importLosses: null,
      importFinalStanding: null,
      status: { not: null },
    },
    select: {
      id: true,
      userId: true,
      name: true,
      season: true,
      status: true,
      platformLeagueId: true,
      settings: true,
    },
    orderBy: [{ season: 'desc' }],
  })

  const caseB = caseBCandidates.filter((row) => {
    const s = row.settings as Record<string, unknown> | null
    return s?.rankImportOnly !== true
  })

  console.log(
    `[Case B] For user ${userIdFilter}: ${caseB.length} Sleeper league(s) with null variant and no import_* (candidates for old ranking-import artifact).`,
  )
  if (caseB.length > 0) {
    console.table(
      caseB.map((r) => ({
        id: r.id,
        name: r.name,
        season: r.season,
        status: r.status,
        platformLeagueId: r.platformLeagueId,
      })),
    )
  }

  if (!applyCaseB) {
    console.log('[Case B] List only — pass --apply-case-b to update (and omit --dry-run to write).')
    return
  }

  if (dryRun) {
    console.log('[Case B] Dry run — no changes for Case B.')
    return
  }

  if (caseB.length === 0) {
    console.log('[Case B] Nothing to update.')
    return
  }

  let updated = 0
  for (const row of caseB) {
    const settings = mergeSettings(row.settings, {
      rankImportOnly: true,
      backfillRankingArtifact: true,
      backfilledAt: new Date().toISOString(),
    })
    await prisma.league.update({
      where: { id: row.id },
      data: {
        leagueVariant: 'legacy_summary',
        status: 'ranking_only',
        settings,
      },
    })
    updated += 1
  }

  console.log(`[Case B] Updated ${updated} league(s) → legacy_summary + ranking_only + settings.rankImportOnly.`)
}

main()
  .catch((err) => {
    console.error('[backfill-ranking-import-variant] failed', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
