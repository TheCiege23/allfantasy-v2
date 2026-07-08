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
    const rows = await prisma.$queryRawUnsafe<Array<{ present: boolean; name: string }>>(
      `SELECT name, to_regclass('public.' || name) IS NOT NULL AS present
       FROM (VALUES ('import_runs'), ('import_warnings'), ('dw_matchup_facts'),
                    ('dw_draft_facts'), ('dw_season_standing_facts')) AS t(name)`,
    )
    for (const r of rows) {
      expect(r.present, `table ${r.name} should exist on the test branch`).toBe(true)
    }
  })

  // --- Previously-blocked write-based integration tests (author + run against the
  //     wired sandbox branch; see docs/NEON_TEST_INFRASTRUCTURE.md §"Blocked tests"). ---

  // Warning persistence: run an import whose payload carries `fetchWarnings`, then
  // assert a matching `ImportWarning` row (code 'source_fetch_incomplete') exists for
  // the run. Validates the §5 end-to-end path (fetch → canonical.warnings → DB).
  it.todo('persists fetchWarnings as ImportWarning rows for the run')

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
