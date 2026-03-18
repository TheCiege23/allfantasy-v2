/**
 * Daily Check-In Service (PROMPT 305).
 * Returns today's "Ask Chimmy" prompt and engagement streak for the daily engagement system.
 */

import { getEngagementStreak } from "@/lib/engagement-engine"
import { getChimmyChatHrefWithPrompt } from "@/lib/ai-product-layer/UnifiedChimmyEntryResolver"
import { getDailyPrompt } from "./daily-prompts"
import type { DailyCheckInData } from "./types"

/**
 * Get full daily check-in payload for the current user: today's prompt, Chimmy href, and streak.
 */
export async function getDailyCheckInData(userId: string): Promise<DailyCheckInData> {
  const daily = getDailyPrompt()
  const chimmyHref = getChimmyChatHrefWithPrompt(daily.prompt)
  const streak = await getEngagementStreak(userId)

  return {
    daily,
    chimmyHref,
    completedToday: streak.todayActive,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    activeDaysCount: streak.activeDaysCount,
  }
}
