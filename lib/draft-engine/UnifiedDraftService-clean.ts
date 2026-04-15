/**
 * UnifiedDraftService.ts
 * High-level facade for draft configuration, execution, and management
 */

import {
  DraftType,
  UnifiedDraftConfig,
  DraftExecutionState,
  DraftPick,
  AIRecommendation,
  ExecutePickRequest,
  ExecutePickResponse,
} from './DraftEngineTypes';
import { SupportedLeagueSport } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { DraftValidationEngine } from './DraftValidationEngine';
import { DraftEngineRegistry } from './DraftEngineRegistry';
import { DraftPermissionsService } from './DraftPermissionsService';

export class UnifiedDraftService {
  /**
   * Get draft configuration for a league
   */
  static async getDraftConfig(leagueId: string): Promise<UnifiedDraftConfig | null> {
    // TODO: Load from database
    // const config = await db.draftConfig.findUnique({ where: { leagueId } });
    // return config;
    return null;
  }

  /**
   * Create a new draft configuration
   */
  static async createDraftConfig(
    leagueId: string,
    sport: SupportedLeagueSport,
    teamCount: number,
    draftType: DraftType,
  ): Promise<UnifiedDraftConfig | null> {
    // Check if draft type is supported by sport
    if (!DraftEngineRegistry.isDraftTypeSupportedBySport(sport, draftType)) {
      return null;
    }

    // Get default config template from registry
    const config = DraftEngineRegistry.getDefaultDraftTemplate(sport, leagueId, teamCount, draftType);
    if (!config) return null;

    // TODO: Save to database

    return config;
  }

  /**
   * Update draft configuration
   */
  static async updateDraftConfig(
    leagueId: string,
    updates: Partial<UnifiedDraftConfig>,
  ): Promise<UnifiedDraftConfig | null> {
    const currentConfig = await this.getDraftConfig(leagueId);
    if (!currentConfig) return null;

    const updatedConfig: UnifiedDraftConfig = {
      ...currentConfig,
      ...updates,
    };

    // Validate updated config
    const validation = DraftValidationEngine.validateDraftConfig(updatedConfig);
    if (validation.errors.length > 0) {
      return null; // validation failed
    }

    // TODO: Save to database

    return updatedConfig;
  }

  /**
   * Execute a pick (atomic operation)
   */
  static async executePick(request: ExecutePickRequest): Promise<ExecutePickResponse> {
    const config = await this.getDraftConfig(request.teamId); // TODO: Fix - should be leagueId
    if (!config) {
      return { success: false, error: 'Draft not found' };
    }

    const state = config.state;

    // Check permissions
    const permissions = DraftPermissionsService.checkDraftPermissions(request.userId, '', [request.teamId], false);

    if (!permissions.canMakePicks) {
      return { success: false, error: 'User does not have permission to make picks' };
    }

    // Validate pick
    const pickValidation = DraftValidationEngine.validatePick(
      { teamId: request.teamId, playerId: request.playerId, slot: request.slot },
      state,
      config,
    );

    if (!pickValidation.isValid) {
      return { success: false, error: pickValidation.error || 'Pick validation failed' };
    }

    // Create pick record
    const pick: DraftPick = {
      pickNumber: state.currentPick,
      round: state.currentRound,
      position: state.currentPosition,
      teamId: request.teamId,
      playerId: request.playerId,
      playerName: '', // TODO: Get from player data
      playerPosition: '', // TODO: Get from player data
      slot: request.slot || 'TBD',
      timestamp: new Date(),
      durationSeconds: 0,
      aiAssisted: false,
      completedBy: 'human',
    };

    // Update state
    const updatedState: DraftExecutionState = {
      ...state,
      picks: [...state.picks, pick],
      currentPick: state.currentPick + 1,
      completedPickCount: state.completedPickCount + 1,
    };

    // Update position within round
    const picksInRound = config.order.filter(o => {
      const picksAtPosition = state.picks.filter(p => p.position === o.position).length + 1;
      return picksAtPosition <= config.order.length;
    }).length;
    
    if (picksInRound >= config.order.length) {
      updatedState.currentRound = state.currentRound + 1;
      updatedState.currentPosition = 1;
    } else {
      updatedState.currentPosition = state.currentPosition + 1;
    }

    // Set next team
    const nextOrderEntry = config.order[updatedState.currentPosition - 1];
    updatedState.currentTeamId = nextOrderEntry?.teamId || '';

    // Check if draft is complete
    const totalPicksNeeded = config.rounds.reduce((sum, r) => sum + r.totalPicks, 0);
    if (updatedState.currentPick > totalPicksNeeded) {
      updatedState.completed = true;
    }

    // TODO: Save to database

    return {
      success: true,
      pick,
      updatedState,
      nextTeamId: updatedState.currentTeamId,
    };
  }

  /**
   * Undo the last pick (commissioner only)
   */
  static async undoPick(
    leagueId: string,
    userId: string,
    isCommissioner: boolean,
  ): Promise<{ success: boolean; error?: string; state?: DraftExecutionState }> {
    if (!isCommissioner) {
      return { success: false, error: 'Only commissioners can undo picks' };
    }

    const config = await this.getDraftConfig(leagueId);
    if (!config) return { success: false, error: 'Draft not found' };

    const state = config.state;
    if (state.picks.length === 0) {
      return { success: false, error: 'No picks to undo' };
    }

    // Remove last pick
    const lastPick = state.picks[state.picks.length - 1];
    const updatedState: DraftExecutionState = {
      ...state,
      picks: state.picks.slice(0, -1),
      currentPick: state.currentPick - 1,
      completedPickCount: state.completedPickCount - 1,
      currentPosition: lastPick.position,
      currentTeamId: lastPick.teamId,
    };

    // TODO: Save to database

    return { success: true, state: updatedState };
  }

  /**
   * Reset draft to initial state
   */
  static async resetDraft(
    leagueId: string,
    userId: string,
    isCommissioner: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isCommissioner) {
      return { success: false, error: 'Only commissioners can reset drafts' };
    }

    const config = await this.getDraftConfig(leagueId);
    if (!config) {
      return { success: false, error: 'Draft not found' };
    }

    const firstTeamId = config.order[0]?.teamId || '';

    // Create new execution state
    const newState: DraftExecutionState = {
      currentPick: 1,
      currentRound: 1,
      currentPosition: 1,
      currentTeamId: firstTeamId,
      picks: [],
      completed: false,
      completedPickCount: 0,
    };

    // TODO: Save to database

    return { success: true };
  }

  /**
   * Get current draft board state
   */
  static async getDraftBoard(leagueId: string): Promise<{
    config: UnifiedDraftConfig;
    state: DraftExecutionState;
  } | null> {
    const config = await this.getDraftConfig(leagueId);
    if (!config) {
      return null;
    }

    return {
      config,
      state: config.state,
    };
  }

  /**
   * Get draft history
   */
  static async getDraftHistory(leagueId: string, limit?: number): Promise<DraftPick[]> {
    const config = await this.getDraftConfig(leagueId);
    if (!config) return [];

    const picks = config.state.picks;
    return limit ? picks.slice(-limit) : picks;
  }

  /**
   * Get AI recommendations for current team
   */
  static async getAIRecommendations(
    leagueId: string,
    teamId: string,
    count: number = 5,
  ): Promise<AIRecommendation[]> {
    const config = await this.getDraftConfig(leagueId);
    if (!config || !config.aiAssistant?.enabled) {
      return [];
    }

    // TODO: Call AI engine to get recommendations
    return [];
  }
}
