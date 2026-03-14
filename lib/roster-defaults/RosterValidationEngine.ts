/**
 * Validates a roster against a sport's template: slot counts and position eligibility.
 * Used by lineup editing, waiver eligibility, and trade validation.
 */
import type { RosterAssignment, RosterValidationResult } from './types'
import { getRosterTemplateDefinition } from './RosterDefaultsRegistry'
import { isPositionEligibleForSlot } from './PositionEligibilityResolver'
import type { SportType } from './types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Validate roster assignments against the sport's template (optionally by format, e.g. IDP for NFL).
 * Returns validation result with per-slot counts and any errors.
 */
export function validateRoster(
  sportType: SportType | string,
  assignments: RosterAssignment[],
  formatType?: string
): RosterValidationResult {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const template = getRosterTemplateDefinition(sport, formatType)
  const errors: string[] = []
  const slotCounts: Record<string, { assigned: number; max: number }> = {}

  for (const slot of template.slots) {
    const assigned = assignments.filter(
      (a) => a.slotName.toUpperCase() === slot.slotName.toUpperCase()
    )
    slotCounts[slot.slotName] = { assigned: assigned.length, max: slot.count }

    if (assigned.length > slot.count) {
      errors.push(`${slot.slotName}: ${assigned.length} assigned, max ${slot.count}`)
    }

    for (const a of assigned) {
      if (!isPositionEligibleForSlot(sport, slot.slotName, a.position)) {
        errors.push(
          `Player in ${slot.slotName} has position ${a.position} (not allowed for this slot)`
        )
      }
    }
  }

  const totalAssigned = assignments.length
  const totalMax =
    template.totalStarterSlots +
    template.totalBenchSlots +
    template.totalIRSlots +
    template.totalTaxiSlots +
    template.totalDevySlots
  if (totalAssigned > totalMax) {
    errors.push(`Total roster size ${totalAssigned} exceeds max ${totalMax}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    slotCounts,
  }
}

/**
 * Check if adding a player to a slot would be valid (position eligibility + slot not full).
 */
export function canAddPlayerToSlot(
  sportType: SportType | string,
  slotName: string,
  position: string,
  currentAssignments: RosterAssignment[],
  formatType?: string
): { allowed: boolean; reason?: string } {
  const sport = typeof sportType === 'string' ? toSportType(sportType) : sportType
  const template = getRosterTemplateDefinition(sport, formatType)
  const slot = template.slots.find(
    (s) => s.slotName.toUpperCase() === slotName.toUpperCase()
  )
  if (!slot) return { allowed: false, reason: `Unknown slot: ${slotName}` }
  const inSlot = currentAssignments.filter(
    (a) => a.slotName.toUpperCase() === slotName.toUpperCase()
  )
  if (inSlot.length >= slot.count) {
    return { allowed: false, reason: `${slotName} is full (${slot.count})` }
  }
  if (!isPositionEligibleForSlot(sportType, slotName, position, formatType)) {
    return {
      allowed: false,
      reason: `Position ${position} not eligible for ${slotName}`,
    }
  }
  return { allowed: true }
}
