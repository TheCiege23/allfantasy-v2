/**
 * Safe re-import: same external league + user → upsert league row + audit run.
 * Uses the same idempotency key as `persistImportWithCanonicalAudit`.
 * Idempotent: completed runs short-circuit in `persistImportWithCanonicalAudit` unless upstream forces refresh.
 */

import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { buildCanonicalImportBundle } from '@/lib/league-import/canonicalImportNormalizer'
import { persistImportWithCanonicalAudit } from '@/lib/league-import/importPersistenceService'
import type { ImportProvider } from '@/lib/league-import/types'

export async function resyncImportedLeague(input: {
  userId: string
  provider: ImportProvider
  sourceId: string
}): Promise<
  | { ok: true; leagueId: string; runId: string; warningCount: number; reviewRequired: boolean }
  | { ok: false; error: string }
> {
  const result = await runImportedLeagueNormalizationPipeline({
    provider: input.provider,
    sourceId: input.sourceId,
    userId: input.userId,
  })
  if (!result.success) {
    return { ok: false, error: result.error }
  }

  const canonical = buildCanonicalImportBundle(result.normalized)
  try {
    const { persisted, runId } = await persistImportWithCanonicalAudit({
      userId: input.userId,
      provider: input.provider,
      normalized: result.normalized,
      canonical,
      allowUpdateExisting: true,
    })
    return {
      ok: true,
      leagueId: persisted.league.id,
      runId,
      warningCount: canonical.warnings.length,
      reviewRequired: canonical.reviewRequired,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
