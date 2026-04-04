import type { BbAutomationTickInput, BbAutomationTickResult } from '@/lib/big-brother/automation/types'

/**
 * Main BB automation orchestrator (phase deadlines, HOH, nominations, veto, votes, eviction).
 * Stub: returns success with zero work until `docs/BIG_BROTHER_AUTOMATION_ENGINE.md` is implemented.
 */
export async function runBigBrotherAutomationTick(
  input: BbAutomationTickInput = {},
): Promise<BbAutomationTickResult> {
  const dryRun = input.dryRun === true
  void input.forceLeagueId
  void input.now

  return {
    ok: true,
    processed: 0,
    skipped: 0,
    errors: [],
    dryRun,
    message: dryRun
      ? '[dryRun] Big Brother automation — no mutations (stub).'
      : 'Big Brother automation stub — no phase transitions yet. See docs/BIG_BROTHER_AUTOMATION_ENGINE.md',
  }
}
