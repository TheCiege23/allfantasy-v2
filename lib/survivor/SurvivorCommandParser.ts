/**
 * Parse @Chimmy official commands for Survivor (PROMPT 346). Deterministic.
 * Extracts intent and parameters; does not validate eligibility (validation in respective engines).
 */

import type { SurvivorParsedCommand, SurvivorCommandIntent } from './types'

const CHIMMY_PREFIX = '@chimmy'
const VOTE_PATTERNS = [
  /vote\s+for\s+(.+)/i,
  /vote\s+(.+)/i,
  /cast\s+vote\s+for\s+(.+)/i,
]
const PLAY_IDOL_PATTERNS = [
  /play\s+idol/i,
  /use\s+idol/i,
  /idol\s+play/i,
]
const CHALLENGE_PICK_PATTERNS = [
  /challenge\s+pick\s+(.+)/i,
  /submit\s+challenge\s+(.+)/i,
]
const IMMUNITY_PATTERNS = [
  /immunity\s+choice\s+(.+)/i,
  /immunity\s+(.+)/i,
]

/**
 * Parse raw message for Survivor official command. Returns intent and extracted params.
 * Does not resolve display names to rosterIds; caller must resolve.
 */
export function parseSurvivorCommand(raw: string): SurvivorParsedCommand {
  const trimmed = raw.trim().toLowerCase()
  const withoutChimmy = trimmed.startsWith(CHIMMY_PREFIX)
    ? trimmed.slice(CHIMMY_PREFIX.length).trim()
    : trimmed

  for (const pattern of VOTE_PATTERNS) {
    const m = withoutChimmy.match(pattern)
    if (m) {
      const target = m[1].trim()
      return {
        intent: 'vote',
        targetDisplayName: target,
        raw,
      }
    }
  }

  for (const pattern of PLAY_IDOL_PATTERNS) {
    if (pattern.test(withoutChimmy)) {
      const idolMatch = withoutChimmy.match(/idol\s+(\w+)/i)
      return {
        intent: 'play_idol',
        idolId: idolMatch?.[1],
        raw,
      }
    }
  }

  for (const pattern of CHALLENGE_PICK_PATTERNS) {
    const m = withoutChimmy.match(pattern)
    if (m) {
      return {
        intent: 'challenge_pick',
        payload: { pick: m[1].trim() },
        raw,
      }
    }
  }

  for (const pattern of IMMUNITY_PATTERNS) {
    const m = withoutChimmy.match(pattern)
    if (m) {
      return {
        intent: 'immunity_choice',
        payload: { choice: m[1].trim() },
        raw,
      }
    }
  }

  if (/confirm\s+minigame|minigame\s+confirm/i.test(withoutChimmy)) {
    return { intent: 'confirm_minigame', raw }
  }

  return { intent: 'unknown', raw }
}

/**
 * Check if message looks like an official command (starts with @Chimmy or known command verb).
 */
export function looksLikeOfficialCommand(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.startsWith(CHIMMY_PREFIX)) return true
  const verbs = ['vote', 'play idol', 'use idol', 'challenge pick', 'immunity', 'confirm minigame']
  return verbs.some((v) => trimmed.startsWith(v))
}
