/**
 * Draft pick roster-fit validation: position eligibility and roster size for IDP/standard leagues.
 * Ensures picked position is allowed by league template and roster does not exceed slot count.
 */

import { getLeagueDraftTemplatePayload } from '@/lib/league/league-draft-template-payload'

export interface RosterFitValidationInput {
  leagueId: string
  rosterId: string
  existingPicks: { rosterId: string; position: string }[]
  newPickPosition: string
}

export interface RosterFitValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate that the new pick has an allowed position and the roster won't exceed template size.
 * Uses the same effective template as the draft pool and roster gate.
 */
export async function validateRosterFitForDraftPick(input: RosterFitValidationInput): Promise<RosterFitValidationResult> {
  const payload = await getLeagueDraftTemplatePayload(input.leagueId).catch(() => null)
  if (!payload) return { valid: true }

  const allowed = payload.allowedPositions
  const posUpper = (input.newPickPosition || '').trim().toUpperCase()
  if (!posUpper) return { valid: false, error: 'Position is required' }
  if (!allowed.has(posUpper)) {
    return {
      valid: false,
      error: `Position "${input.newPickPosition}" is not allowed in this league. Allowed: ${[...allowed].sort().join(', ')}.`,
    }
  }

  const totalSlots = payload.totalRosterSlots
  const thisRosterPickCount = input.existingPicks.filter((p) => p.rosterId === input.rosterId).length
  if (thisRosterPickCount + 1 > totalSlots) {
    return {
      valid: false,
      error: `Roster would exceed maximum size (${totalSlots} slots).`,
    }
  }
  return { valid: true }
}

/**
 * Get allowed positions and total roster size for a league (for queue/autopick filtering).
 */
export async function getAllowedPositionsAndRosterSize(
  leagueId: string,
): Promise<{ allowedPositions: Set<string>; totalRosterSize: number } | null> {
  const payload = await getLeagueDraftTemplatePayload(leagueId).catch(() => null)
  if (!payload) return null
  return {
    allowedPositions: new Set(payload.allowedPositions),
    totalRosterSize: payload.totalRosterSlots,
  }
}
