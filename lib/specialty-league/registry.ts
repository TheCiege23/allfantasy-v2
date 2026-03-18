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
import {
  isSurvivorLeague,
  getSurvivorConfig,
  upsertSurvivorConfig,
} from '@/lib/survivor/SurvivorLeagueConfig'
import {
  isZombieLeague,
  getZombieLeagueConfig,
  upsertZombieLeagueConfig,
} from '@/lib/zombie/ZombieLeagueConfig'
import { getStatus } from '@/lib/zombie/ZombieOwnerStatusService'
import {
  isDevyLeague,
  getDevyConfig,
  upsertDevyConfig,
} from '@/lib/devy/DevyLeagueConfig'

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

function registerSurvivor(): void {
  registerSpecialtyLeague({
    id: 'survivor',
    leagueVariant: 'survivor',
    label: 'Survivor',
    wizardLeagueTypeId: 'survivor',

    detect: isSurvivorLeague,
    getConfig: getSurvivorConfig,
    upsertConfig: upsertSurvivorConfig,

    assets: () => ({
      leagueImage: '',
      firstEntryVideo: undefined,
      introVideo: undefined,
    }),

    firstEntryModal: undefined,
    homeComponent: '@/components/survivor/SurvivorHome',

    summaryRoutePath: '/api/leagues/[leagueId]/survivor/summary',
    aiRoutePath: '/api/leagues/[leagueId]/survivor/ai',

    capabilities: {
      tribeOrchestration: true,
      hiddenPowerSystem: true,
      privateVoting: true,
      eliminationPipeline: true,
      sidecarLeague: true,
      tokenizedReturn: true,
      miniGameRegistry: true,
      mergeJuryPhases: true,
      officialCommandParsing: true,
      aiHostHooks: true,
    },

    // rosterGuard / getExcludedRosterIds: optional; Survivor excludes voted-out/jury for lineup/waiver per product wiring.
    // AI: lib/survivor/ai; entitlement survivor_ai. Automation: council close, token award, jury enrollment in engine.
  })
}

function registerZombie(): void {
  registerSpecialtyLeague({
    id: 'zombie',
    leagueVariant: 'zombie',
    label: 'Zombie',
    wizardLeagueTypeId: 'zombie',

    detect: isZombieLeague,
    getConfig: getZombieLeagueConfig,
    upsertConfig: upsertZombieLeagueConfig,

    assets: () => ({
      leagueImage: '',
      firstEntryVideo: undefined,
      introVideo: undefined,
    }),

    firstEntryModal: undefined,
    homeComponent: '@/components/zombie/ZombieHome',

    summaryRoutePath: '/api/leagues/[leagueId]/zombie/summary',
    aiRoutePath: '/api/leagues/[leagueId]/zombie/ai',

    rosterGuard: async (leagueId, rosterId) => {
      const [config, status] = await Promise.all([
        getZombieLeagueConfig(leagueId),
        getStatus(leagueId, rosterId),
      ])
      return !(config?.zombieTradeBlocked && status === 'Zombie')
    },

    capabilities: {
      statusTransformation: true,
      resourceInventoryLedger: true,
      oneToManyUniverse: true,
      crossLeagueStandings: true,
      promotionRelegationEngine: true,
      weeklyBoardGeneration: true,
      antiCollusionFlagRegistry: true,
      antiNeglectReplacementWorkflow: true,
      aiRecapHooks: true,
    },

    // AI: lib/zombie/ai; entitlement zombie_ai. Universe AI: /api/zombie-universe/[universeId]/ai.
    // Automation: finalize route → ZombieResultFinalizationService (infection, serum, weapon, winnings).
  })
}

function registerDevy(): void {
  registerSpecialtyLeague({
    id: 'devy',
    leagueVariant: 'devy_dynasty',
    label: 'Devy Dynasty',
    wizardLeagueTypeId: 'devy',

    detect: isDevyLeague,
    getConfig: getDevyConfig,
    upsertConfig: upsertDevyConfig,

    assets: () => ({
      leagueImage: '',
      firstEntryVideo: undefined,
      introVideo: undefined,
    }),

    firstEntryModal: undefined,
    homeComponent: '@/components/devy/DevyHome',

    summaryRoutePath: '/api/leagues/[leagueId]/devy/summary',
    aiRoutePath: null,

    // No rosterGuard / getExcludedRosterIds for devy; all rosters can act. Optional: exclude if league phase locks.
  })
}

registerGuillotine()
registerSurvivor()
registerZombie()
registerDevy()
