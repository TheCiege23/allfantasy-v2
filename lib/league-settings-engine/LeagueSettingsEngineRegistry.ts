/**
 * LeagueSettingsEngineRegistry.ts
 * Sport-specific league settings schema registry
 */

import {
  SupportedLeagueSport,
  ISportLeagueSettingsService,
  UnifiedLeagueSettings,
  LeagueType,
  SourcePlatform,
  LeagueSettingsValidationResult,
} from './LeagueSettingsEngineTypes';
import { LeagueSettingsValidationEngine } from './LeagueSettingsValidationEngine';

/**
 * Generic sport service with default implementations
 */
class DefaultSportLeagueSettingsService implements ISportLeagueSettingsService {
  constructor(private sport: SupportedLeagueSport) {}

  getDefaultSettings(leagueType: LeagueType): UnifiedLeagueSettings {
    const defaults = this.getDefaultsByLeagueType(leagueType);
    return defaults;
  }

  validateSettings(settings: UnifiedLeagueSettings): LeagueSettingsValidationResult {
    return LeagueSettingsValidationEngine.validateSettings(settings, this.sport);
  }

  applyDefaultOnCreate(
    sport: SupportedLeagueSport,
    leagueType: LeagueType,
  ): UnifiedLeagueSettings {
    const defaults = this.getDefaultSettings(leagueType);
    return {
      ...defaults,
      meta: {
        ...defaults.meta,
        sport,
        leagueType,
        sourceType: 'created',
        sourcePlatform: null,
        timezone: 'UTC',
        language: 'en',
      },
    };
  }

  normalizeImportedSettings(
    importedData: any,
    sourcePlatform: SourcePlatform,
  ): UnifiedLeagueSettings {
    // Generic implementation - override in sport-specific services
    const defaults = this.getDefaultSettings('redraft');
    return {
      ...defaults,
      meta: {
        ...defaults.meta,
        sourceType: 'imported',
        sourcePlatform,
      },
      importMetadata: {
        originalSourcePlatform: sourcePlatform,
        importMappingNotes: ['Generic import mapping applied'],
        normalizationWarnings: ['Manual configuration recommended after import'],
        preservedFields: [],
        oversizedFields: [],
      },
    };
  }

  protected getDefaultsByLeagueType(leagueType: LeagueType): UnifiedLeagueSettings {
    const baseDefaults: UnifiedLeagueSettings = {
      meta: {
        sport: this.sport,
        leagueType,
        sourceType: 'created',
        sourcePlatform: null,
        timezone: 'UTC',
        language: 'en',
      },
      audit: {
        version: 1,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        changes: [],
        createdAt: new Date(),
        templateMatches: true,
      },
      league: {
        name: `${this.sport} League`,
        description: '',
        visibility: 'private',
        season: new Date().getFullYear(),
        scoringFormat: leagueType === 'best-ball' ? 'ppr' : 'standard',
        playoffSettings: {
          enabled: true,
          numberOfPlayoffTeams: 6,
          playoffStartWeek: 15,
          seasonLength: 17,
          format: 'bracket',
          qualificationMethod: 'seeding',
          secondaryPlayoffEnabled: false,
          consolationBracketEnabled: false,
        },
        schedule: {
          type: 'generated',
          matchupsPerTeam: 13,
        },
      },
      team: {
        numberOfTeams: 10,
        teamNamingRules: 'free',
        franchiseContinuity: leagueType === 'dynasty' ? { enabled: true, franchiseType: 'name-based' } : undefined,
        orphanTeamHandling: 'commissioner-assigns',
      },
      roster: {
        templateKey: `${this.sport.toLowerCase()}-default`,
        isCustom: false,
        matchesTemplate: true,
        version: 1,
      },
      scoring: {
        presetKey: `${this.sport.toLowerCase()}-standard`,
        isCustom: false,
        version: 1,
      },
      draft: {
        draftType: 'snake',
        draftOrder: 'randomized',
        snakeDirection: 'snake',
        timerEnabled: true,
        timerSeconds: 120,
        pauseResumeAllowed: true,
        keeperDraftEnabled: leagueType === 'keeper' || leagueType === 'dynasty',
        dynastyDraftOptions:
          leagueType === 'dynasty'
            ? { rookieDraft: true, minorsExpansion: true }
            : undefined,
      },
      divisions: {
        enabled: false,
        numberOfDivisions: 2,
        playoffQualificationByDivision: false,
        minimumTeamsPerDivision: 4,
      },
      members: {
        inviteSettings: {
          requiresCommissionerApproval: false,
          invitationExpiry: 7,
        },
        joinApprovals: {
          enabled: false,
        },
        memberVisibility: 'league-members-only',
        inactiveManagerHandling: {
          enabled: true,
          daysBeforeInactive: 30,
          autoRemove: false,
        },
        bootRulesEnabled: false,
      },
      coOwners: {
        coOwnerEnabled: true,
        coOwnerPermissionScope: 'limited-edit',
        maxCoOwnersPerTeam: 1,
        coOwnerInviteRules: {
          requiresTeamOwnerApproval: true,
          requiresCommissionerApproval: false,
        },
      },
      commissionerControls: {
        forceLineupEnabled: true,
        lockUnlockWaiversEnabled: true,
        scoreOverrideEnabled: false,
        teamAssignmentEnabled: true,
        auditLogVisible: true,
        emergencyToolsEnabled: true,
        automationTriggersEnabled: false,
        premiumCommissionerToolsEnabled: false,
      },
      schedule: {
        type: 'generated',
        matchupsPerTeam: 13,
      },
    };

    return baseDefaults;
  }
}

/**
 * Global registry for sport-specific services
 */
export class LeagueSettingsEngineRegistry {
  private static readonly services: Map<SupportedLeagueSport, ISportLeagueSettingsService> =
    new Map();

  static {
    // Initialize all sport services
    const sports: SupportedLeagueSport[] = [
      'NFL',
      'NCAAF',
      'NBA',
      'NCAAB',
      'MLB',
      'NHL',
      'Soccer',
    ];

    for (const sport of sports) {
      this.services.set(sport, new DefaultSportLeagueSettingsService(sport));
    }
  }

  /**
   * Get service for a specific sport
   */
  static getService(sport: SupportedLeagueSport): ISportLeagueSettingsService {
    const service = this.services.get(sport);
    if (!service) {
      throw new Error(`Unsupported sport: ${sport}`);
    }
    return service;
  }

  /**
   * Check if sport is supported
   */
  static isSupported(sport: string): sport is SupportedLeagueSport {
    return this.services.has(sport as SupportedLeagueSport);
  }

  /**
   * Register custom sport service (for future extensibility)
   */
  static registerService(
    sport: SupportedLeagueSport,
    service: ISportLeagueSettingsService,
  ): void {
    this.services.set(sport, service);
  }

  /**
   * Get all supported sports
   */
  static getSupportedSports(): SupportedLeagueSport[] {
    return Array.from(this.services.keys());
  }
}
