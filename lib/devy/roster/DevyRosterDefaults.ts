/**
 * Devy Dynasty roster default slot templates. PROMPT 2/6.
 * NFL: QB1 / RB2 / WR2 / TE1 / FLEX2 / [SUPERFLEX] / BENCH12 / IR3 / TAXI6 / DEVY6
 * NBA: G2 / F2 / C1 / FLEX2 / BENCH10 / IR3 / TAXI4 / DEVY5
 * Deterministic: no AI in slot assignment.
 */

import type { DevySportAdapterId } from '../types'
import {
  DEFAULT_DEVY_SLOTS_NFL,
  DEFAULT_DEVY_SLOTS_NBA,
  DEFAULT_TAXI_NFL,
  DEFAULT_TAXI_NBA,
} from '../constants'

export interface DevyRosterSlot {
  /** Slot identifier used in UI and serialization. */
  slotKey: string
  /** Human-readable label. */
  label: string
  /** Category governs scoring and legality checks. */
  category: 'starter' | 'flex' | 'bench' | 'ir' | 'taxi' | 'devy'
  /** Eligible positions for this slot. Empty means any eligible position. */
  eligiblePositions: string[]
  /** Number of slots of this type in the template. */
  count: number
  /** Devy slots accept only non-graduated, devy-eligible (college) players. */
  devyOnly?: boolean
  /** IR slots accept players with injury designation (IR/PUP). */
  irOnly?: boolean
  /** Taxi slots accept pro players in their first 1–2 seasons (commissioner-configurable). */
  taxiOnly?: boolean
}

export interface DevyRosterTemplate {
  sport: 'NFL' | 'NBA'
  superflex: boolean
  slots: DevyRosterSlot[]
  /** Total non-devy roster spots (starters + flex + bench + ir + taxi). */
  proRosterSize: number
  /** Total devy spots. */
  devyRosterSize: number
}

// ─── NFL slot definitions ───────────────────────────────────────────────────

const NFL_STARTERS_BASE: DevyRosterSlot[] = [
  { slotKey: 'QB', label: 'QB', category: 'starter', eligiblePositions: ['QB'], count: 1 },
  { slotKey: 'RB', label: 'RB', category: 'starter', eligiblePositions: ['RB'], count: 2 },
  { slotKey: 'WR', label: 'WR', category: 'starter', eligiblePositions: ['WR'], count: 2 },
  { slotKey: 'TE', label: 'TE', category: 'starter', eligiblePositions: ['TE'], count: 1 },
  { slotKey: 'FLEX', label: 'FLEX', category: 'flex', eligiblePositions: ['RB', 'WR', 'TE'], count: 2 },
]

const NFL_SUPERFLEX_SLOT: DevyRosterSlot = {
  slotKey: 'SUPERFLEX',
  label: 'SUPERFLEX',
  category: 'flex',
  eligiblePositions: ['QB', 'RB', 'WR', 'TE'],
  count: 1,
}

const NFL_BENCH: DevyRosterSlot = {
  slotKey: 'BN', label: 'Bench', category: 'bench', eligiblePositions: [], count: 12,
}
const NFL_IR: DevyRosterSlot = {
  slotKey: 'IR', label: 'IR', category: 'ir', eligiblePositions: [], count: 3, irOnly: true,
}
const NFL_TAXI: DevyRosterSlot = {
  slotKey: 'TAXI', label: 'Taxi', category: 'taxi', eligiblePositions: [], count: DEFAULT_TAXI_NFL, taxiOnly: true,
}
const NFL_DEVY: DevyRosterSlot = {
  slotKey: 'DEVY', label: 'Devy', category: 'devy', eligiblePositions: ['QB', 'RB', 'WR', 'TE'], count: DEFAULT_DEVY_SLOTS_NFL, devyOnly: true,
}

// ─── NBA slot definitions ───────────────────────────────────────────────────

const NBA_STARTERS: DevyRosterSlot[] = [
  { slotKey: 'G', label: 'G', category: 'starter', eligiblePositions: ['PG', 'SG', 'G'], count: 2 },
  { slotKey: 'F', label: 'F', category: 'starter', eligiblePositions: ['SF', 'PF', 'F'], count: 2 },
  { slotKey: 'C', label: 'C', category: 'starter', eligiblePositions: ['C'], count: 1 },
  { slotKey: 'FLEX', label: 'FLEX', category: 'flex', eligiblePositions: ['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C'], count: 2 },
]

const NBA_BENCH: DevyRosterSlot = {
  slotKey: 'BN', label: 'Bench', category: 'bench', eligiblePositions: [], count: 10,
}
const NBA_IR: DevyRosterSlot = {
  slotKey: 'IR', label: 'IR', category: 'ir', eligiblePositions: [], count: 3, irOnly: true,
}
const NBA_TAXI: DevyRosterSlot = {
  slotKey: 'TAXI', label: 'Taxi', category: 'taxi', eligiblePositions: [], count: DEFAULT_TAXI_NBA, taxiOnly: true,
}
const NBA_DEVY: DevyRosterSlot = {
  slotKey: 'DEVY', label: 'Devy', category: 'devy', eligiblePositions: ['G', 'F', 'C'], count: DEFAULT_DEVY_SLOTS_NBA, devyOnly: true,
}

// ─── Template builders ──────────────────────────────────────────────────────

function buildNflTemplate(superflex: boolean): DevyRosterTemplate {
  const starters = [...NFL_STARTERS_BASE]
  if (superflex) starters.push(NFL_SUPERFLEX_SLOT)
  const slots: DevyRosterSlot[] = [...starters, NFL_BENCH, NFL_IR, NFL_TAXI, NFL_DEVY]
  const proRosterSize = starters.reduce((s, sl) => s + sl.count, 0) + NFL_BENCH.count + NFL_IR.count + NFL_TAXI.count
  return {
    sport: 'NFL',
    superflex,
    slots,
    proRosterSize,
    devyRosterSize: NFL_DEVY.count,
  }
}

function buildNbaTemplate(): DevyRosterTemplate {
  const slots: DevyRosterSlot[] = [...NBA_STARTERS, NBA_BENCH, NBA_IR, NBA_TAXI, NBA_DEVY]
  const proRosterSize = NBA_STARTERS.reduce((s, sl) => s + sl.count, 0) + NBA_BENCH.count + NBA_IR.count + NBA_TAXI.count
  return {
    sport: 'NBA',
    superflex: false,
    slots,
    proRosterSize,
    devyRosterSize: NBA_DEVY.count,
  }
}

/**
 * Return the default Devy Dynasty roster template for the given sport adapter.
 * @param adapterId - 'nfl_devy' or 'nba_devy'
 * @param superflex - NFL only: include SUPERFLEX slot (default false)
 */
export function getDevyRosterDefaults(
  adapterId: DevySportAdapterId | 'NFL' | 'NBA',
  superflex = false
): DevyRosterTemplate {
  const isNba = adapterId === 'nba_devy' || adapterId === 'NBA'
  return isNba ? buildNbaTemplate() : buildNflTemplate(superflex)
}

/**
 * Compute how many startup vet draft rounds are needed to fill pro roster spots
 * (starters + bench + IR) across all teams, excluding taxi and devy (filled via other drafts).
 * @param adapterId - 'nfl_devy' or 'nba_devy'
 * @param teamCount - number of teams in the league
 * @param superflex - NFL only
 */
export function getStartupVetRounds(
  adapterId: DevySportAdapterId | 'NFL' | 'NBA',
  teamCount: number,
  superflex = false
): number {
  const template = getDevyRosterDefaults(adapterId, superflex)
  // Pro roster size (starters + flex + bench + IR but NOT taxi — taxi filled via rookie/devy drafts)
  const taxiCount = adapterId === 'nba_devy' || adapterId === 'NBA' ? NBA_TAXI.count : NFL_TAXI.count
  const filledViaStartup = template.proRosterSize - taxiCount
  // Startup draft fills all pro spots per team; rounds = spots per team
  return filledViaStartup > 0 ? filledViaStartup : 0
}

/**
 * Total roster size including devy slots.
 */
export function getTotalRosterSize(template: DevyRosterTemplate): number {
  return template.proRosterSize + template.devyRosterSize
}

/**
 * Slot count by category for a template.
 */
export function getSlotCountsByCategory(template: DevyRosterTemplate): Record<DevyRosterSlot['category'], number> {
  const result: Record<DevyRosterSlot['category'], number> = {
    starter: 0, flex: 0, bench: 0, ir: 0, taxi: 0, devy: 0,
  }
  for (const slot of template.slots) {
    result[slot.category] += slot.count
  }
  return result
}
