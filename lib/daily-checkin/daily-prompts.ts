/**
 * Rotating daily prompts for "Ask Chimmy" — one per weekday + weekend.
 * Deterministic by day of week so all users see the same prompt for the day.
 */

import type { DailyCheckInPrompt } from "./types"

const WEEKDAY_PROMPTS: DailyCheckInPrompt[] = [
  { label: "Today's focus", prompt: "What's the one thing I should focus on in my fantasy league today?" },
  { label: "Waiver watch", prompt: "Who are the top waiver wire targets I should keep an eye on this week?" },
  { label: "Lineup tip", prompt: "Give me one lineup or start/sit tip for this week." },
  { label: "Trade pulse", prompt: "What's the trade market looking like for my league right now? Any buy-low or sell-high ideas?" },
  { label: "Matchup edge", prompt: "How can I get an edge in my matchup this week?" },
]

const WEEKEND_PROMPTS: DailyCheckInPrompt[] = [
  { label: "Weekend prep", prompt: "What should I do this weekend to get ready for next week's matchups?" },
  { label: "Sunday insight", prompt: "Any last-minute lineup or waiver moves I should consider before games lock?" },
]

/**
 * Get today's "Ask Chimmy" prompt (deterministic by day of week).
 */
export function getDailyPrompt(): DailyCheckInPrompt {
  const d = new Date()
  const day = d.getDay()
  const isWeekend = day === 0 || day === 6
  const pool = isWeekend ? WEEKEND_PROMPTS : WEEKDAY_PROMPTS
  const index = isWeekend ? (day === 0 ? 0 : 1) : day - 1
  return pool[Math.max(0, index)] ?? WEEKDAY_PROMPTS[0]!
}
