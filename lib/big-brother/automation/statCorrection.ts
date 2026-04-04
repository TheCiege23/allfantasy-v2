import type { BbStatCorrectionInput, BbStatCorrectionResult } from '@/lib/big-brother/automation/types'

/**
 * Stat correction signal handler (v1: audit + commissioner notify only; no HOH/POV replay).
 * Stub: no DB writes.
 */
export async function handleBbStatCorrectionSignal(
  input: BbStatCorrectionInput = {},
): Promise<BbStatCorrectionResult> {
  void input.leagueId
  void input.redraftSeasonId
  void input.week
  void input.dryRun

  return {
    ok: true,
    leaguesNoted: 0,
    errors: [],
    message: 'BB stat-correction handler stub — see docs/BIG_BROTHER_AUTOMATION_ENGINE.md §14.',
  }
}
