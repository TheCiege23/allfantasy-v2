/**
 * PickExecutionEngine.ts
 * Real-time pick execution, validation, and roster updates
 */

import {
  DraftPick,
  UnifiedDraftConfig,
  DraftExecutionState,
} from './DraftEngineTypes';

export interface PickExecutionResult {
  success: boolean;
  error?: string;
  pick?: DraftPick;
  updatedState?: DraftExecutionState;
  nextTeamId?: string;
  draftComplete?: boolean;
}

export class PickExecutionEngine {
  /**
   * Validate and execute a pick atomically
   */
  static validateAndExecutePick(
    config: UnifiedDraftConfig,
    state: DraftExecutionState,
    teamId: string,
    playerId: string,
    durationSeconds: number,
    aiAssisted: boolean = false,
  ): PickExecutionResult {
    // Check if draft is already completed
    if (state.completed) {
      return { success: false, error: 'Draft is already completed' };
    }

    // Validate team's turn
    if (state.currentTeamId !== teamId) {
      return { success: false, error: `Not this team's turn. Current turn: ${state.currentTeamId}` };
    }

    // Validate player not already drafted
    const playerDrafted = state.picks.some(p => p.playerId === playerId);
    if (playerDrafted) {
      return { success: false, error: 'Player already drafted' };
    }

    // Validate timer
    if (config.timer.enabled && durationSeconds > config.timer.secondsPerPick * 2) {
      return { success: false, error: `Pick duration exceeds maximum (${config.timer.secondsPerPick * 2}s)` };
    }

    // Create pick record
    const pick: DraftPick = {
      pickNumber: state.currentPick,
      round: state.currentRound,
      position: state.currentPosition,
      teamId,
      playerId,
      playerName: '', // TODO: Get from player data
      playerPosition: '', // TODO: Get from player data
      slot: 'TBD',
      timestamp: new Date(),
      durationSeconds,
      aiAssisted,
      completedBy: aiAssisted ? 'ai' : 'human',
    };

    // Calculate next position
    const nextPosition = state.currentPosition + 1;
    const orderLength = config.order.length;
    const isNewRound = nextPosition > orderLength;

    const updatedState: DraftExecutionState = {
      ...state,
      picks: [...state.picks, pick],
      currentPick: state.currentPick + 1,
      completedPickCount: state.completedPickCount + 1,
      currentPosition: isNewRound ? 1 : nextPosition,
      currentRound: isNewRound ? state.currentRound + 1 : state.currentRound,
    };

    // Determine next team
    const totalPicks = config.rounds.reduce((sum, r) => sum + r.totalPicks, 0);
    const draftComplete = updatedState.currentPick > totalPicks;
    updatedState.completed = draftComplete;

    // Get next team (if not complete)
    if (!draftComplete) {
      const nextTeamEntry = config.order[updatedState.currentPosition - 1];
      updatedState.currentTeamId = nextTeamEntry?.teamId || '';
    }

    return {
      success: true,
      pick,
      updatedState,
      nextTeamId: draftComplete ? undefined : updatedState.currentTeamId,
      draftComplete,
    };
  }

  /**
   * Undo last pick
   */
  static undoLastPick(state: DraftExecutionState): PickExecutionResult {
    if (state.picks.length === 0) {
      return { success: false, error: 'No picks to undo' };
    }

    const lastPick = state.picks[state.picks.length - 1];

    const updatedState: DraftExecutionState = {
      ...state,
      picks: state.picks.slice(0, -1),
      currentPick: state.currentPick - 1,
      completedPickCount: state.completedPickCount - 1,
      currentPosition: lastPick.position,
      currentRound: lastPick.round,
      currentTeamId: lastPick.teamId,
      completed: false,
    };

    return {
      success: true,
      updatedState,
      nextTeamId: lastPick.teamId,
    };
  }

  /**
   * Reset draft to initial state
   */
  static resetDraft(config: UnifiedDraftConfig): DraftExecutionState {
    const firstTeamId = config.order[0]?.teamId || '';

    return {
      currentPick: 1,
      currentRound: 1,
      currentPosition: 1,
      currentTeamId: firstTeamId,
      picks: [],
      completed: false,
      completedPickCount: 0,
    };
  }

  /**
   * Get remaining picks for a team
   */
  static getRemainingPicksForTeam(config: UnifiedDraftConfig, state: DraftExecutionState, teamId: string): number {
    const teamPicksSoFar = state.picks.filter(p => p.teamId === teamId).length;
    const totalRounds = config.rounds.length;
    return totalRounds - teamPicksSoFar;
  }

  /**
   * Get draft completion percentage
   */
  static getDraftCompletionPercentage(config: UnifiedDraftConfig, state: DraftExecutionState): number {
    const totalPicks = config.rounds.reduce((sum, r) => sum + r.totalPicks, 0);
    return Math.min(100, Math.round((state.currentPick / totalPicks) * 100));
  }

  /**
   * Get round progress
   */
  static getRoundProgress(
    config: UnifiedDraftConfig,
    state: DraftExecutionState,
  ): {
    currentRound: number;
    totalRounds: number;
    picksInCurrentRound: number;
    picksPerRound: number;
  } {
    const picksPerRound = config.order.length;

    return {
      currentRound: state.currentRound,
      totalRounds: config.rounds.length,
      picksInCurrentRound: state.currentPosition,
      picksPerRound,
    };
  }
}
