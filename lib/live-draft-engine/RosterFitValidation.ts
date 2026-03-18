/**
 * Draft pick roster-fit validation: position eligibility and roster size for IDP/standard leagues.
 * Ensures picked position is allowed by league template and roster does not exceed slot count.
 */

import { prisma } from '@/lib/prisma'
import { getRosterTemplateForLeague } from '@/lib/multi-sport/MultiSportRosterService'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'
import { getFormatTypeForVariant } from '@/lib/sport-defaults/LeagueVariantRegistry'

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
 * Allowed positions are the union of all slot allowedPositions from the league's roster template.
 */
function getAllowedPositionsFromTemplate(slots: { allowedPositions: string[] }[]): Set<string> {
  const set = new Set<string>()
  for (const slot of slots) {
    for (const p of slot.allowedPositions || []) {
      const u = (p || '').trim().toUpperCase()
      if (u) set.add(u)
    }
  }
  return set
}

/**
 * Total roster size = sum over slots of (starterCount + benchCount + reserveCount + taxiCount + devyCount).
 */
function getTotalRosterSize(slots: { starterCount: number; benchCount: number; reserveCount: number; taxiCount: number; devyCount: number }[]): number {
  let n = 0
  for (const s of slots) {
    n += (s.starterCount ?? 0) + (s.benchCount ?? 0) + (s.reserveCount ?? 0) + (s.taxiCount ?? 0) + (s.devyCount ?? 0)
  }
  return n
}

/**
 * Validate that the new pick has an allowed position and the roster won't exceed template size.
 */
export async function validateRosterFitForDraftPick(input: RosterFitValidationInput): Promise<RosterFitValidationResult> {
  const league = await (prisma as any).league.findFirst({
    where: { id: input.leagueId },
    select: { sport: true, leagueVariant: true },
  })
  if (!league) return { valid: true }

  const sportType = leagueSportToSportType(league.sport)
  const formatType = getFormatTypeForVariant(sportType, (league.leagueVariant as string) ?? '')
  const template = await getRosterTemplateForLeague(league.sport, formatType, input.leagueId)
  const allowed = getAllowedPositionsFromTemplate(template.slots)
  const posUpper = (input.newPickPosition || '').trim().toUpperCase()
  if (!posUpper) return { valid: false, error: 'Position is required' }
  if (!allowed.has(posUpper)) {
    return {
      valid: false,
      error: `Position "${input.newPickPosition}" is not allowed in this league. Allowed: ${[...allowed].sort().join(', ')}.`,
    }
  }

  const totalSlots = getTotalRosterSize(template.slots)
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
export async function getAllowedPositionsAndRosterSize(leagueId: string): Promise<{ allowedPositions: Set<string>; totalRosterSize: number } | null> {
  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true },
  })
  if (!league) return null
  const sportType = leagueSportToSportType(league.sport)
  const formatType = getFormatTypeForVariant(sportType, (league.leagueVariant as string) ?? '')
  const template = await getRosterTemplateForLeague(league.sport, formatType, leagueId)
  return {
    allowedPositions: getAllowedPositionsFromTemplate(template.slots),
    totalRosterSize: getTotalRosterSize(template.slots),
  }
}
