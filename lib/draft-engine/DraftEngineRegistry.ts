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

export class DraftEngineRegistry {
  /**
   * Get default draft configuration template for a sport
   */
  static getDefaultDraftTemplate(
    sport: SupportedLeagueSport,
    leagueId: string,
    teamCount: number,
    draftType: DraftType,
  ): UnifiedDraftConfig | null {
    const defaults = sportDefaults[sport];
    if (!defaults) return null;

    if (!defaults.supportedDraftTypes.includes(draftType)) {
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
      sport,
      leagueType: 'redraft', // TODO: Parameterize
      createdAt: new Date(),
      type: draftType,
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
    return sportDefaults[sport] || null;
  }

  /**
   * Check if draft type is supported by sport
   */
  static isDraftTypeSupportedBySport(sport: SupportedLeagueSport, draftType: DraftType): boolean {
    const defaults = sportDefaults[sport];
    return defaults ? defaults.supportedDraftTypes.includes(draftType) : false;
  }

  /**
   * Get all supported draft types for a sport
   */
  static getSupportedDraftTypes(sport: SupportedLeagueSport): DraftType[] {
    const defaults = sportDefaults[sport];
    return defaults ? defaults.supportedDraftTypes : [];
  }

  /**
   * Register a custom draft service for a sport (future extensibility)
   */
  static registerCustomDefaults(sport: SupportedLeagueSport, defaults: DraftServiceDefaults): void {
    sportDefaults[sport] = defaults;
  }
}
