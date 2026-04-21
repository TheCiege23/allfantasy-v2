/**
 * DraftEngineRegistry.ts
 * Registry for sport and draft-type service defaults
 */

import {
  DraftType,
  OrderType,
  UnifiedDraftConfig,
  DraftRound,
  DraftOrderEntry,
  DraftStatus,
  AIStrategy,
  AIPersonality,
  DraftMode,
} from './DraftEngineTypes';
import { SupportedLeagueSport } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

type DraftServiceDefaults = {
  defaultOrderType: OrderType;
  defaultRoundCount: number;
  defaultPickTimerSeconds: number;
  defaultAIStrategy: AIStrategy;
  defaultAIPersonality: AIPersonality;
  defaultDraftMode: DraftMode;
  supportedDraftTypes: DraftType[];
};

function normalizeSportKey(sport: SupportedLeagueSport | string): SupportedLeagueSport | null {
  const raw = String(sport ?? '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper === 'SOCCER') return 'Soccer'
  if (upper === 'NFL' || upper === 'NBA' || upper === 'MLB' || upper === 'NHL' || upper === 'NCAAF' || upper === 'NCAAB') {
    return upper as SupportedLeagueSport
  }
  if (raw === 'Soccer') return 'Soccer'
  return null
}

function normalizeDraftTypeKey(draftType: DraftType | string): DraftType | null {
  const raw = String(draftType ?? '').trim().toLowerCase()
  if (!raw) return null

  const map: Record<string, DraftType> = {
    snake: 'snake',
    linear: 'linear',
    auction: 'auction',
    'salary-cap': 'salary-cap',
    salary_cap: 'salary-cap',
    'third-round-reversal': 'third-round-reversal',
    third_round_reversal: 'third-round-reversal',
    '3rd_reversal': 'third-round-reversal',
    keeper: 'keeper',
    'dynasty-startup': 'dynasty-startup',
    dynasty_startup: 'dynasty-startup',
    startup_draft: 'dynasty-startup',
    'dynasty-rookie': 'dynasty-rookie',
    dynasty_rookie: 'dynasty-rookie',
    rookie_draft: 'dynasty-rookie',
    guillotine: 'guillotine',
    survivor: 'survivor',
    zombie: 'zombie',
    tournament: 'tournament',
    'big-brother': 'big-brother',
    big_brother: 'big-brother',
  }

  return map[raw] ?? null
}

const sportDefaults: Partial<Record<SupportedLeagueSport, DraftServiceDefaults>> = {
  NFL: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 18,
    defaultPickTimerSeconds: 120,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: [
      'snake',
      'linear',
      'auction',
      'salary-cap',
      'keeper',
      'dynasty-startup',
      'dynasty-rookie',
      'third-round-reversal',
    ],
  },
  NBA: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 15,
    defaultPickTimerSeconds: 90,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: [
      'snake',
      'linear',
      'auction',
      'salary-cap',
      'keeper',
      'dynasty-startup',
      'dynasty-rookie',
    ],
  },
  NHL: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 20,
    defaultPickTimerSeconds: 120,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: ['snake', 'linear', 'auction', 'salary-cap', 'keeper', 'dynasty-startup'],
  },
  MLB: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 25,
    defaultPickTimerSeconds: 120,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: [
      'snake',
      'linear',
      'auction',
      'salary-cap',
      'keeper',
      'dynasty-startup',
      'dynasty-rookie',
    ],
  },
  NCAAB: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 16,
    defaultPickTimerSeconds: 90,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: ['snake', 'linear', 'auction', 'keeper', 'dynasty-startup'],
  },
  NCAAF: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 20,
    defaultPickTimerSeconds: 120,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: [
      'snake',
      'linear',
      'auction',
      'keeper',
      'dynasty-startup',
      'dynasty-rookie',
    ],
  },
  Soccer: {
    defaultOrderType: 'randomized',
    defaultRoundCount: 18,
    defaultPickTimerSeconds: 120,
    defaultAIStrategy: 'balanced',
    defaultAIPersonality: 'moderate',
    defaultDraftMode: 'live',
    supportedDraftTypes: ['snake', 'linear', 'auction', 'salary-cap'],
  },
};

/**
 * Validate that a draft mode is supported by the engine (includes auto/offline
 * execution modes wired in via settings, not just live/slow/email).
 */
export function isDraftModeSupported(mode: string): mode is DraftMode {
  return (['live', 'slow', 'email', 'offline', 'auto'] as string[]).includes(mode)
}

/**
 * Validate that a given OrderType includes weighted-lottery support.
 * Weighted lottery is a draft ORDER mode (pick-slot assignment algorithm)
 * rather than a pick-order algorithm (snake/linear/auction).
 */
export function isWeightedLotteryOrderType(orderType: string): boolean {
  return orderType === 'weighted-lottery'
}

export class DraftEngineRegistry {
  /**
   * Get default draft configuration template for a sport
   */
  static getDefaultDraftTemplate(
    sport: SupportedLeagueSport | string,
    leagueId: string,
    teamCount: number,
    draftType: DraftType | string,
  ): UnifiedDraftConfig | null {
    const normalizedSport = normalizeSportKey(sport)
    const normalizedDraftType = normalizeDraftTypeKey(draftType)
    if (!normalizedSport || !normalizedDraftType) return null

    const defaults = sportDefaults[normalizedSport];
    if (!defaults) return null;

    if (!defaults.supportedDraftTypes.includes(normalizedDraftType)) {
      return null; // unsupported draft type for this sport
    }

    // Build order entries
    const orderEntries: DraftOrderEntry[] = Array.from({ length: teamCount }, (_, i) => ({
      position: i + 1,
      teamId: `team-${i + 1}`,
    }));

    // Build rounds
    const rounds: DraftRound[] = Array.from({ length: defaults.defaultRoundCount }, (_, roundIdx) => ({
      roundNumber: roundIdx + 1,
      totalPicks: teamCount,
      startPosition: roundIdx * teamCount + 1,
      roundType: 'standard',
    }));

    const totalPicks = defaults.defaultRoundCount * teamCount;

    return {
      leagueId,
      sport: normalizedSport,
      leagueType: 'redraft', // TODO: Parameterize
      createdAt: new Date(),
      type: normalizedDraftType,
      orderType: defaults.defaultOrderType,
      order: orderEntries,
      rounds,
      totalPicks,
      totalTeams: teamCount,
      timer: {
        enabled: true,
        secondsPerPick: defaults.defaultPickTimerSeconds,
        autoBumpSeconds: 30,
        autoBumpCount: 2,
      },
      aiAssistant: {
        enabled: true,
        autoPickOnTimeExpired: false,
        strategy: defaults.defaultAIStrategy,
        personality: defaults.defaultAIPersonality,
        recommendationMode: 'top5',
        considerTeamNeeds: true,
        considerLeagueContext: true,
        draftWithHistory: true,
      },
      poolSettings: {
        includeRookies: true,
        includeDevy: false,
        includeFreeAgents: true,
      },
      dualTrack: false,
      mode: defaults.defaultDraftMode,
      allowPickUndos: true,
      allowSkipTeam: false,
      allowForcePick: false,
      allowRestart: false,
      status: 'scheduled',
      state: {
        currentPick: 1,
        currentRound: 1,
        currentPosition: 1,
        currentTeamId: orderEntries[0].teamId,
        picks: [],
        completed: false,
        completedPickCount: 0,
      },
      audit: {
        version: 1,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        entries: [],
      },
    };
  }

  /**
   * Get sport-specific defaults
   */
  static getSportDefaults(sport: SupportedLeagueSport): DraftServiceDefaults | null {
    const normalizedSport = normalizeSportKey(sport)
    return normalizedSport ? sportDefaults[normalizedSport] || null : null;
  }

  /**
   * Check if draft type is supported by sport
   */
  static isDraftTypeSupportedBySport(sport: SupportedLeagueSport | string, draftType: DraftType | string): boolean {
    const normalizedSport = normalizeSportKey(sport)
    const normalizedDraftType = normalizeDraftTypeKey(draftType)
    if (!normalizedSport || !normalizedDraftType) return false
    const defaults = sportDefaults[normalizedSport];
    return defaults ? defaults.supportedDraftTypes.includes(normalizedDraftType) : false;
  }

  /**
   * Get all supported draft types for a sport
   */
  static getSupportedDraftTypes(sport: SupportedLeagueSport | string): DraftType[] {
    const normalizedSport = normalizeSportKey(sport)
    if (!normalizedSport) return []
    const defaults = sportDefaults[normalizedSport];
    return defaults ? defaults.supportedDraftTypes : [];
  }

  /**
   * Register a custom draft service for a sport (future extensibility)
   */
  static registerCustomDefaults(sport: SupportedLeagueSport, defaults: DraftServiceDefaults): void {
    sportDefaults[sport] = defaults;
  }
}
