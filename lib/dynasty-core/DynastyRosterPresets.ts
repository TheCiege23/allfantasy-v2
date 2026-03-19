/**
 * Dynasty roster presets and team-size–scaled bench guidance.
 * Shared base for standard Dynasty, Devy, C2C.
 */
import {
  DYNASTY_SUPPORTED_TEAM_SIZES,
  DYNASTY_BENCH_BY_TEAM_SIZE,
  DYNASTY_DEFAULT_12_BENCH,
  DYNASTY_DEFAULT_IR,
  DYNASTY_DEFAULT_TAXI,
  DYNASTY_ROSTER_PRESETS,
} from './constants'
import type { DynastyRosterPresetDto } from './types'

/** Default 12-team dynasty starter counts: QB=1, RB=2, WR=2, TE=1, FLEX=2, SUPERFLEX=1; BENCH=14, IR=3, TAXI=4; K/DEF off. */
export const DEFAULT_12_TEAM_DYNASTY_STARTERS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 2,
  SUPERFLEX: 1,
}
export const DEFAULT_12_TEAM_DYNASTY_BENCH = DYNASTY_DEFAULT_12_BENCH
export const DEFAULT_12_TEAM_DYNASTY_IR = DYNASTY_DEFAULT_IR
export const DEFAULT_12_TEAM_DYNASTY_TAXI = DYNASTY_DEFAULT_TAXI

/**
 * Get recommended bench range [min, max] for a team size.
 */
export function getBenchRangeForTeamSize(teamSize: number): [number, number] {
  const key = String(teamSize)
  return DYNASTY_BENCH_BY_TEAM_SIZE[key] ?? [12, 16]
}

/**
 * Check if team size is supported for dynasty.
 */
export function isSupportedDynastyTeamSize(size: number): boolean {
  return (DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).includes(size)
}

/**
 * Get roster preset DTOs for UI (1QB, Superflex, 2QB, TEP, IDP).
 */
export function getDynastyRosterPresetList(): DynastyRosterPresetDto[] {
  return DYNASTY_ROSTER_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    formatType: p.formatType,
    starterSlots: getStarterSlotsForPreset(p.id),
    benchCount: DEFAULT_12_TEAM_DYNASTY_BENCH,
    irCount: DEFAULT_12_TEAM_DYNASTY_IR,
    taxiCount: DEFAULT_12_TEAM_DYNASTY_TAXI,
    superflexOn: p.id === 'dynasty_superflex' || p.id === 'dynasty_2qb',
    kickerOn: false,
    defenseOn: false,
    idpOn: p.id === 'dynasty_idp',
  }))
}

function getStarterSlotsForPreset(presetId: string): Record<string, number> {
  switch (presetId) {
    case 'dynasty_1qb':
      return { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 }
    case 'dynasty_superflex':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    case 'dynasty_2qb':
      return { QB: 2, RB: 2, WR: 2, TE: 1, FLEX: 2 }
    case 'dynasty_tep':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    case 'dynasty_idp':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    default:
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
  }
}

/**
 * Recommended 12-team dynasty format type for roster template (DB or fallback).
 */
export const DYNASTY_RECOMMENDED_ROSTER_FORMAT = 'dynasty_superflex'
