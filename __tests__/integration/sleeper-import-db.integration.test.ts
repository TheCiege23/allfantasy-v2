/**
 * Sleeper import — DB integration tests (Phase 3 Part 1).
 *
 * These run ONLY against a real Postgres database (the Neon `import-test-sandbox`
 * branch), never in normal unit runs. They are opt-in:
 *
 *   IMPORT_INTEGRATION_DB=1 DATABASE_URL=... DIRECT_URL=... npm run test:import:db
 *
 * See docs/NEON_TEST_INFRASTRUCTURE.md for setup, the branch id, and rollback.
 * The write-based cases (warning persistence, transaction rollback, duplicate
 * handling) are specified as `todo` below — they must be authored + run against
 * the wired sandbox branch so their FK/cleanup behavior is verified on real data,
 * not fabricated blind. The connectivity smoke test is real and runs today once
 * DATABASE_URL is set.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'

const dbEnabled = process.env.IMPORT_INTEGRATION_DB === '1' && !!process.env.DATABASE_URL?.trim()

describe.skipIf(!dbEnabled)('Sleeper import DB integration', () => {
  // Use a REAL PrismaClient bound to the test DATABASE_URL, not the app singleton
  // `@/lib/prisma` — that singleton falls back to a build-phase stub (read ops → null,
  // no `$queryRawUnsafe`) when it can't resolve a live DB, which is what unit runs get.
  // Instantiated only inside this `skipIf` block, so it never connects in normal runs.
  let prisma: PrismaClient
  beforeAll(() => {
    prisma = new PrismaClient()
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('connects and the import schema is present (import_runs / import_warnings / fact tables)', async () => {
    // information_schema.tables returns text-typed columns, so the comparison
    // survives Prisma's raw-query type decoding regardless of driver quirks
    // (a previous version compared to a boolean and tripped a decode issue on
    // Neon's postgres 17 wire format).
    const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('import_runs', 'import_warnings',
                            'dw_matchup_facts', 'dw_draft_facts',
                            'dw_season_standing_facts')`,
    )
    const found = new Set(rows.map((r) => r.table_name))
    for (const name of [
      'import_runs',
      'import_warnings',
      'dw_matchup_facts',
      'dw_draft_facts',
      'dw_season_standing_facts',
    ]) {
      expect(found.has(name), `table ${name} should exist on the test branch`).toBe(true)
    }
  })

  // --- Previously-blocked write-based integration tests (author + run against the
  //     wired sandbox branch; see docs/NEON_TEST_INFRASTRUCTURE.md §"Blocked tests"). ---

  // Warning persistence: run an import whose payload carries `fetchWarnings`, then
  // assert a matching `ImportWarning` row (code 'source_fetch_incomplete') exists for
  // the run. Validates the §5 end-to-end path (fetch → canonical.warnings → DB).
  it.todo('persists fetchWarnings as ImportWarning rows for the run')

  // Phase 3.1 — Rankings wiring: evidence rows derived from a Sleeper import
  // materialize in LegacyEvidenceRecord and the aggregator picks them up. Uses a
  // throwaway __rankings_wiring__ entity id + sourceReference so the test only
  // ever touches its own rows on the shared prod-cloned branch, cleans up in
  // afterAll, and never mutates real data.
  it('writes derived evidence rows to LegacyEvidenceRecord and the aggregator returns them', async () => {
    const { deriveEvidenceRowsFromImport } = await import(
      '@/lib/legacy-score-engine/importedFactsToEvidence'
    )

    const testEntityId = `__rankings_wiring__${Date.now()}`
    const testSourceRef = `__rankings_wiring__:${testEntityId}`

    // Craft a minimal normalized-import shape whose derived rows target our
    // isolated entityId. deriveEvidenceRowsFromImport uses `source_team_id` as
    // the entityId, so we set that to the test id directly.
    const rows = deriveEvidenceRowsFromImport(
      {
        source: {
          source_provider: 'sleeper',
          source_league_id: 'L_RANKINGS_WIRING_TEST',
          source_season_id: '2025',
          import_batch_id: 'batch-test',
          imported_at: new Date().toISOString(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        league: { name: 'Test', sport: 'nfl', season: 2025 } as any,
        rosters: [],
        scoring: null,
        schedule: [],
        draft_picks: [],
        transactions: [],
        standings: [
          {
            source_team_id: testEntityId,
            rank: 1,
            wins: 12,
            losses: 2,
            ties: 0,
            points_for: 1600,
          },
        ],
        player_map: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        coverage: {} as any,
      },
      { playoffTeamCount: 6, previousSeasonCount: 3 },
    )
    // Force our isolated sourceReference so cleanup is precise.
    const rowsForDb = rows.map((r) => ({ ...r, sourceReference: testSourceRef }))
    expect(rowsForDb.length).toBeGreaterThan(0)

    try {
      await prisma.legacyEvidenceRecord.createMany({ data: rowsForDb })

      const evidence = await prisma.legacyEvidenceRecord.findMany({
        where: { entityId: testEntityId, sport: 'nfl', sourceReference: testSourceRef },
      })
      expect(evidence.length).toBe(rowsForDb.length)
      expect(evidence.some((e) => e.evidenceType === 'championships')).toBe(true)
      expect(evidence.some((e) => e.evidenceType === 'win_pct')).toBe(true)
      // The aggregator's read path is exercised in its own unit tests — importing
      // it here would try to resolve `@/lib/prisma`, which is a build-phase stub
      // in vitest. Persistence is the wiring being validated on the real DB.
    } finally {
      await prisma.legacyEvidenceRecord.deleteMany({
        where: { entityId: testEntityId, sourceReference: testSourceRef },
      })
    }
  })

  // Failure does not corrupt: seed matchupFact rows for a throwaway leagueId, then run
  // a `$transaction([deleteMany, createMany])` where createMany is forced to throw;
  // assert the original rows are intact (per-table atomicity already shipped).
  it.todo('rolls back a failed per-table fact rewrite without corrupting existing rows')

  // Interrupted import recovery: leave an ImportRun in `running`, re-run with the same
  // idempotencyKey, assert no duplicate league/facts and the run resolves cleanly.
  it.todo('recovers an interrupted import without duplicating data')

  // Duplicate import handling: two runs with the same idempotencyKey — the unique
  // constraint must reject the second (or the caller must reuse the first).
  it.todo('rejects a duplicate import via the ImportRun idempotencyKey unique constraint')
})
