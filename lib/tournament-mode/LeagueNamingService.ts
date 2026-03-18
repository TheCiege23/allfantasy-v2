/**
 * [NEW] lib/tournament-mode/LeagueNamingService.ts
 * Commissioner-custom and app-generated league naming; uniqueness validation.
 */

import crypto from 'crypto'
import {
  FEEDER_LEAGUE_NAMES,
  LATER_ROUND_NAMES,
  THEMED_CONFERENCE_PAIRS,
} from './constants'
import type { ConferenceMode, LeagueNamingMode } from './types'

/** Validate commissioner-provided league names: non-empty, unique within list. */
export function validateCommissionerLeagueNames(
  names: string[],
  existingInTournament: string[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const seen = new Set(existingInTournament.map((n) => n.trim().toLowerCase()))
  for (let i = 0; i < names.length; i++) {
    const n = (names[i] ?? '').trim()
    if (!n) {
      errors.push(`League name at index ${i + 1} is empty.`)
      continue
    }
    const key = n.toLowerCase()
    if (seen.has(key)) {
      errors.push(`Duplicate league name: "${n}".`)
    }
    seen.add(key)
  }
  return { valid: errors.length === 0, errors }
}

/**
 * Generate league names for a tournament.
 * - commissioner_custom: use provided names (caller must validate length).
 * - app_generated: use theme (black_vs_gold → BEAST/GOAT/…; later rounds → NORTH/SOUTH/EAST/WEST).
 * - ai_themed: same as app_generated for now; AI can be wired later.
 */
export function generateLeagueNames(
  count: number,
  mode: LeagueNamingMode,
  conferenceMode: ConferenceMode,
  roundIndex: number,
  commissionerNames?: string[],
  themeSeed?: number
): string[] {
  if (mode === 'commissioner_custom' && commissionerNames && commissionerNames.length >= count) {
    return commissionerNames.slice(0, count).map((n) => (n ?? '').trim()).filter(Boolean)
  }

  const isLaterRound = roundIndex > 0
  const pool = isLaterRound ? [...LATER_ROUND_NAMES] : [...FEEDER_LEAGUE_NAMES]
  const rng = themeSeed != null ? seededShuffle(pool.length, themeSeed) : undefined
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const idx = rng ? rng[i % rng.length] : i % pool.length
    const base = pool[idx]
    if (names.includes(base)) {
      names.push(`${base} ${(i + 1)}`)
    } else {
      names.push(base)
    }
  }
  return names
}

function seededShuffle(length: number, seed: number): number[] {
  const arr = Array.from({ length }, (_, i) => i)
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Get display name for a conference (fixed Black/Gold or themed pair). */
export function getConferenceDisplayNames(
  conferenceMode: ConferenceMode,
  customNames?: [string, string],
  themeSeed?: number
): [string, string] {
  if (conferenceMode === 'commissioner_custom' && customNames && customNames.length >= 2) {
    return [customNames[0]?.trim() || 'Conference A', customNames[1]?.trim() || 'Conference B']
  }
  if (conferenceMode === 'random_themed' && themeSeed != null) {
    const pairs = THEMED_CONFERENCE_PAIRS
    const idx = Math.abs(themeSeed) % pairs.length
    return [...pairs[idx]!]
  }
  return ['Black', 'Gold']
}

/** Produce a short unique code for invite/display (e.g. 8 chars). */
export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
}
