/**
 * Resolves which positions are eligible for a given slot and sport.
 * Used by draft room filtering, waiver eligibility, and lineup validation.
 */
import type { SportType } from './types'
import { getRosterTemplateDefinition } from './RosterDefaultsRegistry'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Get allowed positions for a slot in a sport (and optional format, e.g. IDP for NFL).
 */
export function getAllowedPositionsForSlot(
  sportType: SportType | string,
  slotName: string,
  formatType?: string
): string[] {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const def = getRosterTemplateDefinition(sport, formatType)
  const slot = def.slots.find(
    (s) => s.slotName.toUpperCase() === slotName.toUpperCase()
  )
  if (!slot) return []
  if (slot.allowedPositions.includes('*')) {
    const starterPositions = def.slots
      .filter((s) => s.slotType === 'starter' && !s.isFlexibleSlot)
      .flatMap((s) => s.allowedPositions)
      .filter((p) => p !== '*')
    const unique = [...new Set(starterPositions)]
    return unique.length ? unique : ['*']
  }
  return [...slot.allowedPositions]
}

/**
 * Check if a position is eligible for a slot in the given sport (and optional format).
 */
export function isPositionEligibleForSlot(
  sportType: SportType | string,
  slotName: string,
  position: string,
  formatType?: string
): boolean {
  const allowed = getAllowedPositionsForSlot(sportType, slotName, formatType)
  if (allowed.includes('*')) return true
  const pos = position.toUpperCase()
  if (allowed.map((p) => p.toUpperCase()).includes(pos)) return true
  if (sportType === 'SOCCER' && slotName === 'GKP' && pos === 'GK') return true
  return false
}

/**
 * Get all positions that are valid for the sport (and optional format) for draft room filter list.
 */
export function getPositionsForSport(sportType: SportType | string, formatType?: string): string[] {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const def = getRosterTemplateDefinition(sport, formatType)
  const set = new Set<string>()
  for (const slot of def.slots) {
    for (const p of slot.allowedPositions) {
      if (p !== '*') set.add(p)
    }
  }
  return [...set]
}
