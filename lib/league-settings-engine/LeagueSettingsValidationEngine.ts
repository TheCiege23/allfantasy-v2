/**
 * LeagueSettingsValidationEngine.ts
 * Unified validation for league settings across all sports
 * Supports sport-specific + universal validation rules
 */

import {
  UnifiedLeagueSettings,
  LeagueSettingsValidationResult,
  LeagueSettingsValidationError,
  SupportedLeagueSport,
  LeagueType,
  LeagueSettingsPage,
} from './LeagueSettingsEngineTypes';

export class LeagueSettingsValidationEngine {
  /**
   * Validate complete settings profile
   */
  static validateSettings(
    settings: UnifiedLeagueSettings,
    sport: SupportedLeagueSport,
  ): LeagueSettingsValidationResult {
    const errors: LeagueSettingsValidationError[] = [];
    const warnings: LeagueSettingsValidationError[] = [];
    const impactedSystems: Set<string> = new Set();
    const regenerationRequired: Set<string> = new Set();

    // ===== UNIVERSAL VALIDATIONS =====

    // League settings
    if (!settings.league.name || settings.league.name.trim().length === 0) {
      errors.push({
        field: 'league.name',
        page: 'league',
        message: 'League name is required',
        severity: 'error',
      });
    }

    if (settings.league.name && settings.league.name.length > 100) {
      errors.push({
        field: 'league.name',
        page: 'league',
        message: 'League name must be 100 characters or less',
        severity: 'error',
      });
    }

    if (!settings.meta.sport) {
      errors.push({
        field: 'meta.sport',
        page: 'league',
        message: 'Sport is required',
        severity: 'error',
      });
    }

    // Team settings
    if (settings.team.numberOfTeams < 2) {
      errors.push({
        field: 'team.numberOfTeams',
        page: 'team',
        message: 'Minimum 2 teams required',
        severity: 'error',
      });
    }

    if (settings.team.numberOfTeams > 100) {
      errors.push({
        field: 'team.numberOfTeams',
        page: 'team',
        message: 'Maximum 100 teams allowed',
        severity: 'error',
      });
    }

    // Draft settings
    if (!settings.draft.draftType) {
      errors.push({
        field: 'draft.draftType',
        page: 'draft',
        message: 'Draft type is required',
        severity: 'error',
      });
    }

    // Division settings
    if (settings.divisions.enabled) {
      if (!settings.divisions.numberOfDivisions || settings.divisions.numberOfDivisions < 2) {
        errors.push({
          field: 'divisions.numberOfDivisions',
          page: 'divisions',
          message: 'At least 2 divisions required if divisions are enabled',
          severity: 'error',
        });
      }

      if (
        settings.divisions.numberOfDivisions &&
        settings.divisions.minimumTeamsPerDivision &&
        settings.divisions.numberOfDivisions * settings.divisions.minimumTeamsPerDivision >
          settings.team.numberOfTeams
      ) {
        errors.push({
          field: 'divisions.numberOf Divisions',
          page: 'divisions',
          message: `Division structure requires at least ${
            settings.divisions.numberOfDivisions * (settings.divisions.minimumTeamsPerDivision || 1)
          } teams, but only ${settings.team.numberOfTeams} available`,
          severity: 'error',
        });
      }
    }

    // Playoff settings
    if (settings.league.playoffSettings.enabled) {
      if (
        !settings.league.playoffSettings.numberOfPlayoffTeams ||
        settings.league.playoffSettings.numberOfPlayoffTeams < 2
      ) {
        errors.push({
          field: 'league.playoffSettings.numberOfPlayoffTeams',
          page: 'league',
          message: 'At least 2 playoff teams required if playoffs are enabled',
          severity: 'error',
        });
      }

      if (
        settings.league.playoffSettings.numberOfPlayoffTeams &&
        settings.league.playoffSettings.numberOfPlayoffTeams > settings.team.numberOfTeams
      ) {
        errors.push({
          field: 'league.playoffSettings.numberOfPlayoffTeams',
          page: 'league',
          message: `Cannot have more playoff teams (${settings.league.playoffSettings.numberOfPlayoffTeams}) than total teams (${settings.team.numberOfTeams})`,
          severity: 'error',
        });
      }

      if (
        settings.league.playoffSettings.playoffStartWeek &&
        settings.league.playoffSettings.seasonLength &&
        settings.league.playoffSettings.playoffStartWeek >= settings.league.playoffSettings.seasonLength
      ) {
        errors.push({
          field: 'league.playoffSettings.playoffStartWeek',
          page: 'league',
          message: `Playoff start week (${settings.league.playoffSettings.playoffStartWeek}) must be before season end (week ${settings.league.playoffSettings.seasonLength})`,
          severity: 'error',
        });
      }
    }

    // ===== SPORT-SPECIFIC VALIDATIONS =====
    const sportSpecificResult = this.validateSportSpecific(settings, sport);
    errors.push(...sportSpecificResult.errors);
    warnings.push(...sportSpecificResult.warnings);
    sportSpecificResult.impactedSystems.forEach(sys => impactedSystems.add(sys));
    sportSpecificResult.regenerationRequired.forEach(sys => regenerationRequired.add(sys));

    // ===== CONSISTENCY CHECKS =====

    // Check if roster config exists for this sport
    if (!settings.roster?.templateKey) {
      warnings.push({
        field: 'roster.templateKey',
        page: 'roster',
        message: 'Roster template not yet configured',
        severity: 'warning',
      });
      impactedSystems.add('roster');
      regenerationRequired.add('roster');
    }

    // Check if scoring config exists
    if (!settings.scoring?.presetKey) {
      warnings.push({
        field: 'scoring.presetKey',
        page: 'scoring',
        message: 'Scoring preset not yet configured',
        severity: 'warning',
      });
      impactedSystems.add('scoring');
      regenerationRequired.add('scoring');
    }

    // Check schedule consistency
    if (settings.league.playoffSettings.enabled && settings.league.schedule?.matchupsPerTeam) {
      const regularSeasonWeeks = settings.league.playoffSettings.playoffStartWeek || 12;
      const requiredWeeks = Math.ceil(
        (settings.league.schedule.matchupsPerTeam * (settings.team.numberOfTeams - 1)) /
          (settings.team.numberOfTeams / 2),
      );

      if (regularSeasonWeeks < requiredWeeks) {
        warnings.push({
          field: 'league.schedule',
          page: 'league',
          message: `Regular season (${regularSeasonWeeks} weeks) may not be long enough to accommodate ${settings.league.schedule.matchupsPerTeam} matchups per team`,
          severity: 'warning',
        });
        impactedSystems.add('schedule');
        regenerationRequired.add('schedule');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      impactedSystems: Array.from(impactedSystems),
      regenerationRequired: Array.from(regenerationRequired),
      canSave: errors.length === 0, // can save if no errors, even if there are warnings
    };
  }

  /**
   * Sport-specific validation rules
   */
  private static validateSportSpecific(
    settings: UnifiedLeagueSettings,
    sport: SupportedLeagueSport,
  ): {
    errors: LeagueSettingsValidationError[];
    warnings: LeagueSettingsValidationError[];
    impactedSystems: string[];
    regenerationRequired: string[];
  } {
    const errors: LeagueSettingsValidationError[] = [];
    const warnings: LeagueSettingsValidationError[] = [];
    const impactedSystems: string[] = [];
    const regenerationRequired: string[] = [];

    switch (sport) {
      case 'NFL':
      case 'NCAAF': {
        // Football: QB depth warnings
        const qbDepth = settings.roster?.templateKey ? 1 : 0; // placeholder
        if (settings.team.numberOfTeams > 10 && qbDepth < 2) {
          warnings.push({
            field: 'roster',
            page: 'roster',
            message: `With ${settings.team.numberOfTeams} teams, consider 2+ QB roster slots to avoid QB scarcity`,
            severity: 'warning',
          });
        }

        // IDP warnings for IDP leagues
        if (settings.league.playoffSettings.format === 'custom') {
          impactedSystems.push('schedule');
          regenerationRequired.push('schedule');
        }
        break;
      }

      case 'NBA':
      case 'NCAAB': {
        // Basketball: position balance
        if (settings.team.numberOfTeams > 14) {
          warnings.push({
            field: 'team.numberOfTeams',
            page: 'team',
            message: 'Large league (>14 teams) may cause position scarcity for centers',
            severity: 'warning',
          });
          impactedSystems.push('roster');
        }
        break;
      }

      case 'MLB': {
        // Baseball: pitcher/hitter balance
        if (settings.team.numberOfTeams > 15) {
          warnings.push({
            field: 'team.numberOfTeams',
            page: 'team',
            message: 'Large league (>15 teams) may affect pitcher and hitter availability',
            severity: 'warning',
          });
          impactedSystems.push('roster');
        }
        break;
      }

      case 'NHL': {
        // Hockey: goalie minimum
        warnings.push({
          field: 'roster',
          page: 'roster',
          message: 'Ensure roster includes at least 2 goalie slots to avoid goalie shortage',
          severity: 'warning',
        });
        break;
      }

      case 'Soccer': {
        // Soccer: formation and keeper
        warnings.push({
          field: 'roster',
          page: 'roster',
          message: 'Verify roster includes minimum 1 goalkeeper slot',
          severity: 'warning',
        });
        break;
      }
    }

    return { errors, warnings, impactedSystems, regenerationRequired };
  }

  /**
   * Validate page-specific update
   */
  static validatePageUpdate(
    currentSettings: UnifiedLeagueSettings,
    updatedData: Partial<UnifiedLeagueSettings>,
    page: LeagueSettingsPage,
    sport: SupportedLeagueSport,
  ): LeagueSettingsValidationResult {
    const mergedSettings: UnifiedLeagueSettings = {
      ...currentSettings,
      ...updatedData,
    };

    const result = this.validateSettings(mergedSettings, sport);

    // Filter to errors/warnings related to the page being updated
    result.errors = result.errors.filter(e => e.page === page || e.page === 'league');
    result.warnings = result.warnings.filter(w => w.page === page || w.page === 'league');

    return result;
  }

  /**
   * Check if sport/league type combination is valid
   */
  static isValidSportLeagueTypeCombination(
    sport: SupportedLeagueSport,
    leagueType: LeagueType,
  ): boolean {
    const validCombinations: Record<SupportedLeagueSport, LeagueType[]> = {
      NFL: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      NCAAF: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      NBA: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      NCAAB: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      MLB: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      NHL: ['redraft', 'keeper', 'dynasty', 'best-ball'],
      Soccer: ['seasonal', 'tournament', 'redraft'],
    };

    return validCombinations[sport]?.includes(leagueType) ?? false;
  }
}
