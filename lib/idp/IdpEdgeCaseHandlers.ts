/**
 * IDP edge-case handlers and safe validation rules.
 * - Prevent broken roster setups; warn when scoring is dominant; no silent defender moves without audit.
 * PROMPT 5/6.
 */

import { getRosterDefaultsForIdpLeague } from '@/lib/idp/IDPLeagueConfig'
import { getAllowedPositionsForIdpSlot } from '@/lib/idp/IDPEligibility'
import type { IdpPositionMode } from './types'
import { IDP_GROUPED_POSITIONS, IDP_SPLIT_POSITIONS } from './types'

/**
 * Allowed IDP slot names for this league (for UI: grouped-only vs split-only vs hybrid).
 * Use to avoid showing split-only filter in grouped league and vice versa.
 */
export async function getAllowedIdpSlotNamesForLeague(leagueId: string): Promise<{
  grouped: string[]
  split: string[]
  all: string[]
}> {
  const defaults = await getRosterDefaultsForIdpLeague(leagueId)
  const starter_slots = defaults?.starter_slots ?? {}
  const grouped: string[] = []
  const split: string[] = []
  for (const slot of IDP_GROUPED_POSITIONS) {
    if (typeof starter_slots[slot] === 'number' && starter_slots[slot] > 0) grouped.push(slot)
  }
  for (const slot of IDP_SPLIT_POSITIONS) {
    if (typeof starter_slots[slot] === 'number' && starter_slots[slot] > 0) split.push(slot)
  }
  if (typeof starter_slots.IDP_FLEX === 'number' && starter_slots.IDP_FLEX > 0) {
    grouped.push('IDP_FLEX')
    split.push('IDP_FLEX')
  }
  return {
    grouped,
    split,
    all: [...new Set([...grouped, ...split])],
  }
}

/**
 * Check if a proposed lineup (slot -> position or player position) has any IDP slot with no legal player.
 * Use after waiver claim or trade to warn "insufficient legal defenders" or "no legal DE for DE slot".
 */
export function checkIdpLineupGaps(
  slotAssignments: Array<{ slotName: string; position: string | null }>,
  positionMode: IdpPositionMode
): { valid: boolean; gaps: string[] } {
  const gaps: string[] = []
  for (const { slotName, position } of slotAssignments) {
    const slot = slotName.toUpperCase()
    if (!['DL', 'LB', 'DB', 'IDP_FLEX', 'DE', 'DT', 'CB', 'S'].includes(slot)) continue
    const allowed = getAllowedPositionsForIdpSlot(slot, positionMode)
    if (allowed.length === 0) continue
    const pos = (position ?? '').trim().toUpperCase()
    const legal =
      pos && allowed.some((a) => a === pos || (slot === 'DL' && (pos === 'DE' || pos === 'DT')) || (slot === 'DB' && (pos === 'CB' || pos === 'S' || pos === 'SS' || pos === 'FS')))
    if (!legal) gaps.push(slot)
  }
  return { valid: gaps.length === 0, gaps }
}

/**
 * After waiver or trade: ensure roster can still field a legal IDP lineup (enough IDP-eligible bodies per slot type).
 * Does not assign who goes where; only checks counts. For full legality use checkIdpLineupGaps with actual lineup.
 */
export async function canRosterFieldLegalIdpLineup(
  leagueId: string,
  idpEligiblePositionCounts: Record<string, number>
): Promise<{ canField: boolean; missing: Record<string, number> }> {
  const defaults = await getRosterDefaultsForIdpLeague(leagueId)
  const starter_slots = defaults?.starter_slots ?? {}
  const missing: Record<string, number> = {}
  let canField = true
  for (const [slot, count] of Object.entries(starter_slots)) {
    const c = typeof count === 'number' ? count : 0
    if (c <= 0) continue
    const slotUpper = slot.toUpperCase()
    if (slotUpper === 'IDP_FLEX') continue
    const needed = c
    const have =
      slotUpper === 'DL'
        ? (idpEligiblePositionCounts['DE'] ?? 0) + (idpEligiblePositionCounts['DT'] ?? 0)
        : slotUpper === 'DB'
          ? (idpEligiblePositionCounts['CB'] ?? 0) + (idpEligiblePositionCounts['S'] ?? 0)
          : idpEligiblePositionCounts[slotUpper] ?? 0
    if (have < needed) {
      missing[slot] = needed - have
      canField = false
    }
  }
  return { canField, missing }
}
