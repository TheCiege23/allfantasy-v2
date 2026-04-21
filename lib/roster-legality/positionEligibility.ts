import type { RosterTemplateDto, RosterTemplateSlotDto } from '@/lib/multi-sport/RosterTemplateService'
import { normalizePositionForStarterEligibility } from '@/lib/roster/LineupTemplateValidation'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type PlayerLike = {
  id: string
  position?: string | null
}

function slotAcceptsPosition(slot: RosterTemplateSlotDto, posNorm: string): boolean {
  const allowed = (slot.allowedPositions ?? []).map((p) => normalizePositionForStarterEligibility(String(p)))
  if (allowed.length === 0 || allowed.includes('*')) return true
  if (!posNorm) return false
  return allowed.includes(posNorm)
}

/** Starters-only: which conceptual slot rows can this player fill (by template order). */
export function getEligibleStarterSlotIndices(player: PlayerLike, template: RosterTemplateDto): number[] {
  const pos = normalizePositionForStarterEligibility(String(player.position ?? ''))
  if (!pos) return []
  const indices: number[] = []
  template.slots.forEach((slot, i) => {
    if ((slot.starterCount ?? 0) <= 0) return
    if (slotAcceptsPosition(slot, pos)) indices.push(i)
  })
  return indices
}

export function canPlayerOccupyStarterTemplateSlot(
  player: PlayerLike,
  slot: RosterTemplateSlotDto,
): boolean {
  const pos = normalizePositionForStarterEligibility(String(player.position ?? ''))
  if (!pos) return false
  return slotAcceptsPosition(slot, pos)
}

/** Validates UTIL / FLEX rules: UTIL typically excludes pitchers in MLB when slot lists exclude P/SP/RP. */
export function validateRosterAssignmentsForTemplate(
  starters: PlayerLike[],
  template: RosterTemplateDto,
): Array<{ playerId: string; message: string }> {
  const issues: Array<{ playerId: string; message: string }> = []
  const starterSlots = template.slots.filter((s) => (s.starterCount ?? 0) > 0)
  if (starterSlots.length === 0 || starters.length === 0) return issues

  for (let i = 0; i < Math.min(starters.length, starterSlots.length); i += 1) {
    const p = starters[i]
    const slot = starterSlots[i]
    if (!p?.id || !slot) continue
    if (!canPlayerOccupyStarterTemplateSlot(p, slot)) {
      issues.push({
        playerId: p.id,
        message: `Player is not eligible for starter slot "${slot.slotName}" with position ${String(p.position ?? '')}.`,
      })
    }
  }
  return issues
}

export function getEligibleSlotsForPlayer(
  player: PlayerLike,
  template: RosterTemplateDto,
  sport: string,
): string[] {
  void sport
  const pos = normalizePositionForStarterEligibility(String(player.position ?? ''))
  if (!pos) return []
  const names: string[] = []
  for (const slot of template.slots) {
    if ((slot.starterCount ?? 0) <= 0) continue
    if (slotAcceptsPosition(slot, pos)) names.push(slot.slotName)
  }
  return names
}

export function normalizeSportKey(sport: string): string {
  return normalizeToSupportedSport(sport)
}
