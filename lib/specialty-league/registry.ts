/**
 * Specialty League Registry — maps league variant and wizard type to specs.
 * Add new league types here after implementing their spec (config, engine, UI, AI).
 *
 * PROMPT 336 — AllFantasy Specialty League Factory Template.
 */

import type { SpecialtyLeagueId, SpecialtyLeagueSpec } from './types'
import {
  isGuillotineLeague,
  getGuillotineConfig,
  upsertGuillotineConfig,
} from '@/lib/guillotine/GuillotineLeagueConfig'
import {
  GUILLOTINE_LEAGUE_IMAGE,
  GUILLOTINE_FIRST_ENTRY_VIDEO,
  GUILLOTINE_INTRO_VIDEO,
} from '@/lib/guillotine/constants'
import { isRosterChopped, getChoppedRosterIds } from '@/lib/guillotine/guillotineGuard'

const registry = new Map<SpecialtyLeagueId, SpecialtyLeagueSpec>()

/** Register a specialty league spec. Call from module side-effect or from a central bootstrap. */
export function registerSpecialtyLeague(spec: SpecialtyLeagueSpec): void {
  registry.set(spec.id, spec)
}

/** Get spec by specialty id. */
export function getSpecialtySpec(id: SpecialtyLeagueId): SpecialtyLeagueSpec | undefined {
  return registry.get(id)
}

/** Get spec by League.leagueVariant (e.g. "guillotine"). */
export function getSpecialtySpecByVariant(variant: string | null): SpecialtyLeagueSpec | undefined {
  if (!variant) return undefined
  const v = variant.toLowerCase().trim()
  for (const spec of registry.values()) {
    if (spec.leagueVariant.toLowerCase() === v) return spec
  }
  return undefined
}

/** Get spec by wizard league type id (e.g. "guillotine" from LeagueTypeId). */
export function getSpecialtySpecByWizardType(wizardLeagueTypeId: string): SpecialtyLeagueSpec | undefined {
  const id = wizardLeagueTypeId.toLowerCase().trim()
  for (const spec of registry.values()) {
    if (spec.wizardLeagueTypeId.toLowerCase() === id) return spec
  }
  return undefined
}

/** All registered specialty league ids. */
export function listSpecialtyLeagueIds(): SpecialtyLeagueId[] {
  return Array.from(registry.keys())
}

/** All registered specs (for admin or docs). */
export function listSpecialtySpecs(): SpecialtyLeagueSpec[] {
  return Array.from(registry.values())
}

// --- Guillotine registration (reference implementation) ---

function registerGuillotine(): void {
  registerSpecialtyLeague({
    id: 'guillotine',
    leagueVariant: 'guillotine',
    label: 'Guillotine',
    wizardLeagueTypeId: 'guillotine',

    detect: isGuillotineLeague,
    getConfig: getGuillotineConfig,
    upsertConfig: upsertGuillotineConfig,

    assets: () => ({
      leagueImage: GUILLOTINE_LEAGUE_IMAGE,
      firstEntryVideo: GUILLOTINE_FIRST_ENTRY_VIDEO,
      introVideo: GUILLOTINE_INTRO_VIDEO,
    }),

    firstEntryModal: '@/components/guillotine/GuillotineFirstEntryModal',
    homeComponent: '@/components/guillotine/GuillotineHome',

    summaryRoutePath: '/api/leagues/[leagueId]/guillotine/summary',
    aiRoutePath: '/api/leagues/[leagueId]/guillotine/ai',

    rosterGuard: async (leagueId, rosterId) => !(await isRosterChopped(leagueId, rosterId)),
    getExcludedRosterIds: getChoppedRosterIds,

    // AI: implemented in lib/guillotine/ai and route /api/leagues/[leagueId]/guillotine/ai; entitlement guillotine_ai.
    // Automation/event log: invoked by cron or manual triggers (see lib/guillotine).
    // Commissioner override: in guillotine engine; can be wired to commissionerActions if desired.
  })
}

registerGuillotine()
