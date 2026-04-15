/**
 * DraftValidationEngine.ts
 * Validates draft configurations and pick logic
 */

import {
  UnifiedDraftConfig,
  DraftValidationResult,
  DraftExecutionState,
  DraftPick,
  DraftStatus,
} from './DraftEngineTypes';
import { SupportedLeagueSport } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

export class DraftValidationEngine {
  /**
   * Validate complete draft config
   */
  static validateDraftConfig(config: UnifiedDraftConfig): DraftValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ===== DRAFT MECHANICS =====

    if (!config.type) {
      errors.push('Draft type is required');
    }

    if (config.totalTeams < 2 || config.totalTeams > 100) {
      errors.push(`Team count must be 2-100, got ${config.totalTeams}`);
    }

    if (config.rounds.length === 0) {
      errors.push('At least one draft round required');
    }

    if (!config.order || config.order.length !== config.totalTeams) {
      errors.push(`Draft order must include all ${config.totalTeams} teams`);
    }

    // Validate order entries
    const seenTeams = new Set<string>();
    config.order.forEach((entry, idx) => {
      if (seenTeams.has(entry.teamId)) {
        errors.push(`Team ${entry.teamId} appears multiple times in draft order`);
      }
      seenTeams.add(entry.teamId);
      if (entry.position !== idx + 1) {
        errors.push(`Draft position mismatch at index ${idx}`);
      }
    });

    // Validate timer
    if (config.timer.enabled && config.timer.secondsPerPick < 5) {
      errors.push('Timer must be at least 5 seconds per pick');
    }

    if (config.timer.enabled && config.timer.secondsPerPick > 600) {
      warnings.push('Very long timer (<30 min per pick) may extend draft duration');
    }

    // Validate AI assistant
    if (config.aiAssistant.enabled) {
      if (!config.aiAssistant.strategy) {
        errors.push('AI strategy must be specified if AI is enabled');
      }
      if (!config.aiAssistant.personality) {
        errors.push('AI personality must be specified if AI is enabled');
      }
    }

    // Sport-specific validation
    const sportSpecific = this.validateSportSpecific(config);
    errors.push(...sportSpecific.errors);
    warnings.push(...sportSpecific.warnings);

    // ===== UI VALIDATION =====

    if (config.dualTrack && !config.dualTrackConfig) {
      errors.push('Dual-track config required if dualTrack = true');
    }

    // ===== CONSISTENCY =====

    const totalPossiblePicks = config.rounds.reduce((sum, r) => sum + r.totalPicks, 0);
    if (totalPossiblePicks < 1) {
      errors.push('Total picks must be > 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canStart:
        errors.length === 0 &&
        config.order.length === config.totalTeams &&
        config.totalPicks > 0,
    };
  }

  /**
   * Validate a pick is legal
   */
  static validatePick(
    pick: {
      teamId: string;
      playerId: string;
      slot?: string;
    },
    state: DraftExecutionState,
    config: UnifiedDraftConfig,
  ): { isValid: boolean; error?: string } {
    // Check it's current team's turn
    if (pick.teamId !== state.currentTeamId) {
      return { isValid: false, error: 'Not this team\'s turn' };
    }

    // Check player not already drafted
    const playerAlreadyPicked = state.picks.some(p => p.playerId === pick.playerId);
    if (playerAlreadyPicked) {
      return { isValid: false, error: 'Player already drafted' };
    }

    // TODO: Check player eligibility based on poolSettings
    // TODO: Check slot eligibility based on roster config

    return { isValid: true };
  }

  /**
   * Sport-specific validation
   */
  private static validateSportSpecific(config: UnifiedDraftConfig): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (config.sport) {
      case 'NFL':
      case 'NCAAF': {
        if (config.rounds.length > 50) {
          warnings.push('Very deep draft (>50 rounds) may not be viable for football');
        }
        break;
      }

      case 'NBA':
      case 'NCAAB': {
        if (config.rounds.length > 30) {
          warnings.push('Basketball rosters typically don\'t exceed 30 rounds');
        }
        break;
      }

      case 'MLB': {
        if (config.type === 'dynasty-startup' && config.rounds.length < 50) {
          warnings.push('Dynasty baseball often uses 50+ round startup drafts');
        }
        break;
      }

      case 'NHL': {
        if (config.rounds.length > 25) {
          warnings.push('Hockey rosters typically don\'t exceed 25 rounds');
        }
        break;
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate draft type for sport + league type combination
   */
  static isValidDraftTypeForSportLeagueType(
    sport: SupportedLeagueSport,
    leagueType: string,
    draftType: string,
  ): boolean {
    // Generic validation - can be refined per sport
    if (
      leagueType === 'dynasty' &&
      draftType !== 'dynasty-startup' &&
      draftType !== 'dynasty-rookie'
    ) {
      return false; // dynasty leagues should use dynasty draft types
    }

    if (leagueType === 'keeper' && draftType === 'dynasty-startup') {
      return false; // keeper leagues don't use startup
    }

    return true;
  }

  /**
   * Calculate total picks needed based on roster config
   */
  static calculateTotalPicksNeeded(rosterSlots: number, teamCount: number): number {
    return rosterSlots * teamCount;
  }

  /**
   * Check if draft can be started
   */
  static canStartDraft(config: UnifiedDraftConfig): boolean {
    const validation = this.validateDraftConfig(config);
    return validation.canStart && config.status === 'scheduled';
  }
}
