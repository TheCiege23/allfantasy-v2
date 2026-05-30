/**
 * worldCupChimmyRateLimit.ts
 *
 * Per-user-per-UTC-day cap on Chimmy private AI replies in World Cup
 * pool chat. Protects OpenAI cost by preventing unlimited Pro-user calls.
 *
 * Data source: counts existing `worldCupBracketChatEvent` rows where the
 * user authored a CHIMMY_PRIVATE prompt today. Each prompt triggers
 * exactly one OpenAI call in the route, so prompt count == AI call count.
 *
 * No schema change needed.
 */
import "server-only"
import { prisma } from "@/lib/prisma"
import { DAILY_CAP_LIMITS, type CapTier } from "@/lib/ai/dailyCaps"
import { WORLD_CUP_POOL_CHAT_EVENT_TYPES } from "./worldCupPoolChatPlan"

/**
 * Legacy hard-coded limit kept for backward compatibility.
 * New code should use `DAILY_CAP_LIMITS.chimmy[tier]` via checkWorldCupChimmyRateLimit.
 * @deprecated Pass a `tier` to checkWorldCupChimmyRateLimit instead.
 */
export const WORLD_CUP_CHIMMY_DAILY_LIMIT = 20

function startOfUtcDay(now: Date): Date {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

/**
 * Counts the user's own Chimmy prompts already submitted today (UTC).
 * Counts prompts (isAiGenerated:false) rather than replies because each
 * prompt → exactly one OpenAI call. Counting prompts is the cleanest
 * proxy for OpenAI calls without depending on JSON-field filters.
 *
 * Fails open (returns 0) on database error to avoid blocking the user
 * when the rate-limit count itself fails.
 */
export async function countChimmyAiCallsToday(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const dayStart = startOfUtcDay(now)
  try {
    const count = await (prisma as any).worldCupBracketChatEvent.count({
      where: {
        userId,
        eventType: WORLD_CUP_POOL_CHAT_EVENT_TYPES.CHIMMY_PRIVATE,
        // Prompts (user-authored). Each prompt triggers one OpenAI reply.
        isAiGenerated: false,
        createdAt: { gte: dayStart },
      },
    })
    return typeof count === "number" ? count : 0
  } catch {
    // Fail open — never block the user because the counter query crashed.
    return 0
  }
}

export type ChimmyRateLimitResult = {
  allowed: boolean
  used: number
  limit: number
}

/**
 * Returns whether the user can trigger another Chimmy AI reply today.
 *
 * Pass `tier` (from `resolveWcCapTier`) to use the tier-appropriate daily limit
 * from `DAILY_CAP_LIMITS.chimmy[tier]`:
 *   free  → 3/day   (same as general AI chimmy cap)
 *   pro   → 30/day
 *   admin → 75/day
 *
 * When `tier` is omitted, defaults to 'pro' so existing callers that already
 * passed the Pro gate aren't suddenly limited to 3. Migrate callers to pass
 * the actual tier for accurate enforcement.
 */
export async function checkWorldCupChimmyRateLimit(
  userId: string,
  now: Date = new Date(),
  tier: CapTier = 'pro'
): Promise<ChimmyRateLimitResult> {
  const used = await countChimmyAiCallsToday(userId, now)
  const limit = DAILY_CAP_LIMITS.chimmy[tier]
  return {
    allowed: used < limit,
    used,
    limit,
  }
}
