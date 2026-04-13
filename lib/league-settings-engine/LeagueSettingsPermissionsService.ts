/**
 * LeagueSettingsPermissionsService.ts
 * Role-based permission checks for league settings
 */

import { UserRole, UserPermissions, RolePermissionConfig, LeagueSettingsPage } from './LeagueSettingsEngineTypes';

export class LeagueSettingsPermissionsService {
  /**
   * Permission matrix: what each role can edit
   */
  private static readonly ROLE_PERMISSIONS: RolePermissionConfig = {
    commissioner: {
      editablePages: [
        'league',
        'team',
        'roster',
        'scoring',
        'draft',
        'divisions',
        'members',
        'co-owners',
        'commissioner-control',
        'previous-leagues',
        'delete-league',
      ],
      canAccessPremium: true,
      canDeleteLeague: true,
    },
    'co-owner': {
      editablePages: ['roster', 'scoring', 'draft'], // limited to roster/scoring/draft
      canAccessPremium: false,
      canDeleteLeague: false,
    },
    member: {
      editablePages: [], // members view only
      canAccessPremium: false,
      canDeleteLeague: false,
    },
    viewer: {
      editablePages: [],
      canAccessPremium: false,
      canDeleteLeague: false,
    },
  };

  /**
   * Check if user has permission to access a specific page
   */
  static canAccessPage(role: UserRole, page: LeagueSettingsPage): boolean {
    const editablePages = this.ROLE_PERMISSIONS[role]?.editablePages || [];
    return editablePages.includes(page);
  }

  /**
   * Check user permissions for the league
   */
  static checkUserPermissions(
    userId: string,
    leagueId: string,
    leagueCommissionerId: string,
    coOwnerIds: string[] = [],
    isPremiumSubscriber: boolean = false,
  ): UserPermissions {
    let role: UserRole;
    let isCommissioner = false;
    let isCoOwner = false;
    let isMember = false;

    if (userId === leagueCommissionerId) {
      role = 'commissioner';
      isCommissioner = true;
    } else if (coOwnerIds.includes(userId)) {
      role = 'co-owner';
      isCoOwner = true;
    } else {
      role = 'member';
      isMember = true;
    }

    const rolePerms = this.ROLE_PERMISSIONS[role];

    return {
      role,
      isCommissioner,
      isCoOwner,
      isMember,
      readOnly: !isCommissioner,
      editablePages: rolePerms.editablePages,
      canAccessPremium: rolePerms.canAccessPremium && isPremiumSubscriber,
      canManageCoOwners: isCommissioner,
      canDeleteLeague: isCommissioner,
    };
  }

  /**
   * Determine if settings page should be read-only for this user
   */
  static isPageReadOnly(permissions: UserPermissions, page: LeagueSettingsPage): boolean {
    if (permissions.isCommissioner) return false;
    return !permissions.editablePages.includes(page);
  }

  /**
   * Check if user can save settings changes
   */
  static canSaveSettings(permissions: UserPermissions): boolean {
    return permissions.isCommissioner;
  }

  /**
   * Check if user can access premium-gated controls
   */
  static canAccessPremiumControl(permissions: UserPermissions): boolean {
    return permissions.isCommissioner && permissions.canAccessPremium;
  }

  /**
   * Get filtered pages visible to user
   */
  static getVisiblePages(permissions: UserPermissions): LeagueSettingsPage[] {
    const allPages: LeagueSettingsPage[] = [
      'league',
      'team',
      'roster',
      'scoring',
      'draft',
      'divisions',
      'members',
      'co-owners',
      'commissioner-control',
      'previous-leagues',
      'delete-league',
    ];

    if (permissions.isCommissioner) {
      return allPages;
    }

    // Co-owners and members see most pages except commissioner-only and delete
    return allPages.filter(page => {
      if (page === 'commissioner-control' || page === 'delete-league') return false;
      return true;
    });
  }

  /**
   * Get user-friendly reason for permission denial
   */
  static getPermissionDenialReason(role: UserRole, page: LeagueSettingsPage): string {
    if (role === 'commissioner') return '';
    if (page === 'commissioner-control') return 'Commissioner controls are only available to the league commissioner';
    if (page === 'delete-league') return 'Only the commissioner can delete a league';
    return 'You do not have permission to edit this page';
  }

  /**
   * Check if user can manage co-owners
   */
  static canManageCoOwners(permissions: UserPermissions): boolean {
    return permissions.isCommissioner;
  }

  /**
   * Check if user can approve/reject changes (commissioner tools)
   */
  static canApproveChanges(permissions: UserPermissions): boolean {
    return permissions.isCommissioner;
  }
}
