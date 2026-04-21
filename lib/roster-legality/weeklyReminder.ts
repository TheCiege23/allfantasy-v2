/**
 * Stable hash for `RosterLegalityWeeklyReminder.issueHash` — same issues in a week dedupe notifications.
 */
export function hashRosterLegalityReminder(
  season: number,
  week: number,
  issueCodes: string[],
  rosterOverflowCount: number,
): string {
  const sorted = [...issueCodes].filter(Boolean).sort()
  return `${season}:${week}:${sorted.join('|')}:ov:${rosterOverflowCount}`
}
