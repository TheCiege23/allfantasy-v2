import 'server-only'

import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'

/**
 * Single structured block for direct Anthropic/Chimmy calls so models always see authoritative time.
 */
export async function getChimmyOfficialTimePrefix(userId: string): Promise<string> {
  try {
    const tc = await buildAiTimeContextPayload(userId)
    const rel = tc.relativeCalendarHints
    return [
      `Official time: server UTC ${tc.serverNowUTC}; account timezone ${tc.userTimezone}; user local ${tc.userLocalTime}.`,
      `User calendar date: ${tc.currentUserDate} (${tc.currentUserDayOfWeekName}).`,
      rel ? `Relative: today=${rel.todayInUserTz}, tomorrow=${rel.tomorrowDateInUserTz}.` : '',
      tc.timezoneMismatch || tc.deviceClockMismatch
        ? `Mismatch flags: timezoneMismatch=${tc.timezoneMismatch}, deviceClockMismatch=${tc.deviceClockMismatch}.`
        : '',
      tc.waiversProcessAt ? `Next waiver run (estimated): ${tc.waiversProcessAt}.` : '',
      tc.nextLockTimeUTC ? `Next lock (if provided): ${tc.nextLockTimeUTC}.` : '',
      tc.freshnessSummary ? `Data freshness: ${tc.freshnessSummary}` : '',
      tc.sportWindow?.note ?? '',
    ]
      .filter(Boolean)
      .join(' ')
  } catch {
    return ''
  }
}

/** Prepends the official time line to user-role model content (all league / Chimmy surfaces). */
export async function withOfficialTimeUserMessage(userId: string, userMessage: string): Promise<string> {
  const prefix = await getChimmyOfficialTimePrefix(userId)
  return prefix ? `${prefix}\n\n${userMessage}` : userMessage
}
