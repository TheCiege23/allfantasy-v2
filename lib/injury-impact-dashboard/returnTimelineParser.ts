import type { InjuryReturnTimeline, InjurySeverityBucket } from './types'

/**
 * Parse return-window info from raw injury feed text. Best-effort only — returns a structured
 * interpretation when patterns are clear, `unknown` category otherwise. Never invents numbers.
 *
 * Recognized patterns (case-insensitive):
 *   - "day-to-day", "day to day", "DTD"                           → day_to_day
 *   - "week-to-week", "week to week"                              → week_to_week
 *   - "out for the season", "season-ending", "OFS"                → season_ending
 *   - "IR-R", "Injured Reserve - Return", "designated to return"  → ir_return_eligible
 *   - "N-M weeks" (e.g. "2-4 weeks")                              → weeks_window (midpoint)
 *   - "N weeks" (e.g. "3 weeks", "about 2 weeks")                 → weeks_window (N)
 *   - "return(ing) (by|in) week X"                                → expected_return_week
 *   - "expected back week X"                                      → expected_return_week
 */
export function parseReturnTimeline(
  rawText: string | null | undefined,
  severity: InjurySeverityBucket,
): InjuryReturnTimeline | null {
  const text = rawText?.trim()
  if (!text) {
    // Severity alone can carry a soft signal even without free-text.
    if (severity === 'ir') {
      return {
        category: 'ir_return_eligible',
        weeks: null,
        returnWeek: null,
        rawText: null,
        label: 'On IR — monitor designation-to-return window',
      }
    }
    return null
  }
  const t = text.toLowerCase()

  if (/\b(out\s+for\s+(the\s+)?season|season[-\s]?ending|ofs|placed\s+on\s+season[-\s]?ending)\b/.test(t)) {
    return { category: 'season_ending', weeks: null, returnWeek: null, rawText: text, label: 'Out for season' }
  }

  const retWeekMatch = t.match(/(?:return|returning|back|expected\s+back)[^0-9]{0,24}week\s*(\d{1,2})/)
  if (retWeekMatch) {
    const wk = Number(retWeekMatch[1])
    if (Number.isFinite(wk) && wk >= 1 && wk <= 24) {
      return {
        category: 'expected_return_week',
        weeks: null,
        returnWeek: wk,
        rawText: text,
        label: `Expected back week ${wk}`,
      }
    }
  }

  const rangeMatch = t.match(/(\d{1,2})\s*[-–to]{1,3}\s*(\d{1,2})\s+weeks?\b/)
  if (rangeMatch) {
    const lo = Number(rangeMatch[1])
    const hi = Number(rangeMatch[2])
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo >= 0 && hi >= lo && hi <= 30) {
      const mid = Math.round(((lo + hi) / 2) * 10) / 10
      return {
        category: 'weeks_window',
        weeks: mid,
        returnWeek: null,
        rawText: text,
        label: `${lo}-${hi} weeks (~${mid} wks)`,
      }
    }
  }

  const singleWeeksMatch = t.match(/\b(?:about\s+|around\s+|~\s*)?(\d{1,2})\s+weeks?\b/)
  if (singleWeeksMatch) {
    const wk = Number(singleWeeksMatch[1])
    if (Number.isFinite(wk) && wk >= 1 && wk <= 30) {
      return {
        category: 'weeks_window',
        weeks: wk,
        returnWeek: null,
        rawText: text,
        label: `~${wk} week${wk === 1 ? '' : 's'}`,
      }
    }
  }

  if (/\b(ir[-\s]?r\b|injured\s+reserve[-\s]*return|designated\s+to\s+return)/.test(t)) {
    return {
      category: 'ir_return_eligible',
      weeks: null,
      returnWeek: null,
      rawText: text,
      label: 'IR — designated to return / eligible window',
    }
  }

  if (/\bweek[-\s]?to[-\s]?week\b/.test(t)) {
    return { category: 'week_to_week', weeks: null, returnWeek: null, rawText: text, label: 'Week-to-week' }
  }

  if (/\bday[-\s]?to[-\s]?day\b|\bdtd\b/.test(t)) {
    return { category: 'day_to_day', weeks: null, returnWeek: null, rawText: text, label: 'Day-to-day' }
  }

  if (severity === 'ir') {
    return {
      category: 'ir_return_eligible',
      weeks: null,
      returnWeek: null,
      rawText: text,
      label: 'On IR — return window not specified',
    }
  }

  return { category: 'unknown', weeks: null, returnWeek: null, rawText: text, label: 'Return window not specified' }
}
