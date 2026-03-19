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
const JURY_VOTE_PATTERNS = [
  /jury\s+vote\s+for\s+(.+)/i,
  /jury\s+vote\s+(.+)/i,
  /final(?:e)?\s+vote\s+for\s+(.+)/i,
  /final(?:e)?\s+vote\s+(.+)/i,
]
const PLAY_IDOL_PATTERNS = [
  /(?:play|use)\s+idol(?:\s+(\w+))?(.*)$/i,
  /idol\s+play(?:\s+(\w+))?(.*)$/i,
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

  for (const pattern of JURY_VOTE_PATTERNS) {
    const m = withoutChimmy.match(pattern)
    if (m) {
      const target = m[1].trim()
      return {
        intent: 'jury_vote',
        targetDisplayName: target,
        raw,
      }
    }
  }

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
    const m = withoutChimmy.match(pattern)
    if (m) {
      const remainder = m[2]?.trim() ?? ''
      const swapMatch = remainder.match(/(?:\s*(?:for|on)\s+(.+?))?\s+swap\s+(.+?)\s+for\s+(.+)\s*$/i)
      if (swapMatch) {
        return {
          intent: 'play_idol',
          idolId: m[1]?.trim(),
          targetDisplayName: swapMatch[1]?.trim(),
          playerDisplayName: swapMatch[2]?.trim(),
          secondaryPlayerDisplayName: swapMatch[3]?.trim(),
          payload: {
            swapBenchPlayer: swapMatch[2]?.trim(),
            swapStarterPlayer: swapMatch[3]?.trim(),
          },
          raw,
        }
      }

      const pickMatch = remainder.match(/(?:\s*(?:for|on)\s+(.+?))?\s+pick\s+(.+)\s*$/i)
      if (pickMatch) {
        return {
          intent: 'play_idol',
          idolId: m[1]?.trim(),
          targetDisplayName: pickMatch[1]?.trim(),
          playerDisplayName: pickMatch[2]?.trim(),
          payload: { pick: pickMatch[2]?.trim() },
          raw,
        }
      }

      const targetMatch = remainder.match(/\s*(?:for|on)\s+(.+)\s*$/i)
      return {
        intent: 'play_idol',
        idolId: m[1]?.trim(),
        targetDisplayName: targetMatch?.[1]?.trim(),
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

  const confirmMinigameMatch = withoutChimmy.match(
    /(?:confirm\s+(?:tribe\s+decision|minigame)|minigame\s+confirm)(?:\s+(.+))?/i
  )
  if (confirmMinigameMatch) {
    return {
      intent: 'confirm_minigame',
      payload: confirmMinigameMatch[1]?.trim() ? { choice: confirmMinigameMatch[1].trim() } : undefined,
      raw,
    }
  }

  return { intent: 'unknown', raw }
}

/**
 * Check if message looks like an official command (starts with @Chimmy or known command verb).
 */
export function looksLikeOfficialCommand(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.startsWith(CHIMMY_PREFIX)) return true
  const verbs = ['vote', 'jury vote', 'final vote', 'play idol', 'use idol', 'challenge pick', 'submit challenge', 'immunity', 'confirm minigame', 'confirm tribe decision']
  return verbs.some((v) => trimmed.startsWith(v))
}
