/**
 * Deterministic shortcuts for Chimmy.
 *
 * Returns a pre-built answer for questions that do not require an AI call,
 * saving provider credits and reducing latency. Returns null when the question
 * requires AI.
 *
 * Sports schedule guardrail:
 * - If the user asks about today's games and no schedule context is available,
 *   we return a deterministic refusal rather than calling a paid provider.
 * - If schedule data exists we return null so the pipeline proceeds normally
 *   (the schedule will be injected into the system prompt by the pipeline).
 */
import 'server-only'

import { prisma } from '@/lib/prisma'

// ── Schedule question detection ───────────────────────────────────────────────

const SCHEDULE_PATTERNS: RegExp[] = [
  /\b(what|are|any|which)\s+(sports?\s+)?games?\s+(are\s+)?(on|playing|today|tonight|now|scheduled)\b/i,
  /\bwhat('?s|\s+is)\s+(on\s+)?(tonight|today)\b/i,
  /\b(today|tonight)('?s)?\s+(schedule|games?|matchups?|action)\b/i,
  /\bgames?\s+(?:are\s+)?(today|tonight|now|being\s+played|on\s+today)\b/i,
  /\bwhat\s+sports?\s+(are\s+)?(on|playing|happening)\s+(today|tonight|now)\b/i,
  /\b(nfl|nba|mlb|nhl|soccer|ncaa)\s+games?\s+(today|tonight)\b/i,
]

export function detectScheduleQuestion(message: string): boolean {
  return SCHEDULE_PATTERNS.some((p) => p.test(message))
}

// ── Schedule context availability ─────────────────────────────────────────────

/**
 * Returns true if there are games in the DB scheduled for today (UTC).
 * Fails safely (returns false) if the DB query errors.
 */
export async function checkScheduleContextAvailable(): Promise<boolean> {
  try {
    const now = new Date()
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1_000)

    const count = await prisma.gameSchedule.count({
      where: {
        startTime: { gte: dayStart, lt: dayEnd },
      },
    })
    return count > 0
  } catch {
    return false
  }
}

// ── Deterministic responses ───────────────────────────────────────────────────

const SCHEDULE_REFUSAL =
  "I need live schedule data connected before I can answer today's games accurately."

/**
 * Check whether the message can be answered deterministically.
 *
 * Returns the deterministic answer string, or null if the pipeline should run.
 *
 * Current shortcuts:
 * 1. Schedule question with no schedule data in the DB →
 *    returns the guardrail refusal without calling any provider.
 */
export async function tryDeterministicAnswer(message: string): Promise<string | null> {
  if (detectScheduleQuestion(message)) {
    const hasContext = await checkScheduleContextAvailable()
    if (!hasContext) {
      return SCHEDULE_REFUSAL
    }
  }
  return null
}

/** Metadata marker for deterministic responses. */
export const DETERMINISTIC_SOURCE = 'deterministic' as const
