/**
 * AI/content moderation bridge: profanity filter, spam detection, optional AI.
 * Profanity and spam use simple patterns; AI can be wired later.
 */

const DEFAULT_PROFANITY_PATTERNS: RegExp[] = []
const DEFAULT_SPAM_PATTERNS: RegExp[] = [
  /\b(https?:\/\/[^\s]+){3,}/i,
  /(.)\1{10,}/,
]

export type ContentModerationResult = {
  allowed: boolean
  reason?: string
  flags?: ("profanity" | "spam" | "ai_flag")[]
}

/**
 * Simple profanity check (pattern-based). Extend with word list or API.
 */
export function checkProfanity(text: string): boolean {
  if (!text || typeof text !== "string") return false
  const normalized = text.toLowerCase().trim()
  for (const p of DEFAULT_PROFANITY_PATTERNS) {
    if (p.test(normalized)) return true
  }
  return false
}

/**
 * Simple spam heuristics (repeated links, long repeated chars).
 */
export function checkSpam(text: string): boolean {
  if (!text || typeof text !== "string") return false
  for (const p of DEFAULT_SPAM_PATTERNS) {
    if (p.test(text)) return true
  }
  return false
}

/**
 * Moderate text (profanity + spam). Returns allowed and optional flags.
 */
export function moderateText(text: string): ContentModerationResult {
  const flags: ContentModerationResult["flags"] = []
  if (checkProfanity(text)) flags.push("profanity")
  if (checkSpam(text)) flags.push("spam")
  return {
    allowed: flags.length === 0,
    reason: flags.length ? `Flagged: ${flags.join(", ")}` : undefined,
    flags: flags.length ? flags : undefined,
  }
}

/**
 * Optional: call external AI moderation API. Stub for now.
 */
export async function moderateWithAI(_text: string): Promise<ContentModerationResult> {
  return { allowed: true }
}
