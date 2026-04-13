/**
 * DraftPermissionsService.ts
 * Permission checks for draft operations
 */

import { DraftPermissions } from './DraftEngineTypes';

export class DraftPermissionsService {
  /**
   * Check user permissions for draft operations
   */
  static checkDraftPermissions(
    userId: string,
    leagueCommissionerId: string,
    teamIds: string[],
    isPremiumSubscribed: boolean,
  ): DraftPermissions {
    const isCommissioner = userId === leagueCommissionerId;
    const isTeamManager = teamIds.includes(userId);

    return {
      canViewDraft: true, // all members can view draft
      canMakePicks: isTeamManager, // only team managers can make picks
      canEditSettings: isCommissioner, // only commissioner can edit
      canStartDraft: isCommissioner,
      canPauseDraft: isCommissioner,
      canResetDraft: isCommissioner,
      canUndoPick: isCommissioner,
      canAccessAI: isTeamManager && isPremiumSubscribed, // only premium teams can use AI
    };
  }

  /**
   * Check if user can make a specific pick
   */
  static canMakePick(userId: string, permissions: DraftPermissions, currentTeamId: string, userTeamId: string): boolean {
    return permissions.canMakePicks && userTeamId === currentTeamId && userId === userTeamId; // TODO: resolve userId to teamId
  }

  /**
   * Check if user can edit draft settings
   */
  static canEditDraftSettings(permissions: DraftPermissions): boolean {
    return permissions.canEditSettings;
  }

  /**
   * Check if user can reset draft
   */
  static canResetDraft(permissions: DraftPermissions): boolean {
    return permissions.canResetDraft;
  }

  /**
   * Check if user can undo a pick
   */
  static canUndoPick(permissions: DraftPermissions): boolean {
    return permissions.canUndoPick;
  }

  /**
   * Check if user can use AI recommendations
   */
  static canUseAI(permissions: DraftPermissions): boolean {
    return permissions.canAccessAI;
  }
}
