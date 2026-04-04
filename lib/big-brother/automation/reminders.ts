import type { BbReminderSweepInput, BbReminderSweepResult } from '@/lib/big-brother/automation/types'

/**
 * T−24h / T−1h style deadline reminders (Chimmy + notification log).
 * Stub: no-op until wired to BigBrotherNotificationLog + senders.
 */
export async function runBbReminderSweep(input: BbReminderSweepInput = {}): Promise<BbReminderSweepResult> {
  const dryRun = input.dryRun === true
  void input.now

  return {
    ok: true,
    remindersScheduled: 0,
    errors: [],
    dryRun,
    message: dryRun
      ? '[dryRun] BB reminder sweep — no sends (stub).'
      : 'BB reminder sweep stub — no reminders scheduled yet.',
  }
}
