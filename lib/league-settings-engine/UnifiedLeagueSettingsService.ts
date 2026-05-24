/**
 * UnifiedLeagueSettingsService.ts
 * High-level facade for league settings operations
 * Coordinates registry, validation, permissions, and persistence
 */

import { prisma } from '@/lib/prisma';
import {
  UnifiedLeagueSettings,
  LeagueSettingsValidationResult,
  LeagueSettingsAuditEntry,
  SupportedLeagueSport,
  LeagueType,
  SourcePlatform,
  LeagueSettingsPage,
  UserPermissions,
} from './LeagueSettingsEngineTypes';
import { LeagueSettingsEngineRegistry } from './LeagueSettingsEngineRegistry';
import { LeagueSettingsValidationEngine } from './LeagueSettingsValidationEngine';
import { LeagueSettingsPermissionsService } from './LeagueSettingsPermissionsService';

function resolveLeagueTypeFromVariant(leagueVariant: string | null, isDynasty: boolean): LeagueType {
  const v = (leagueVariant ?? '').toLowerCase()
  if (v.includes('dynasty') || isDynasty) return 'dynasty'
  if (v.includes('keeper')) return 'keeper'
  if (v.includes('devy')) return 'devy'
  if (v.includes('tournament')) return 'tournament'
  if (v.includes('best_ball') || v.includes('bestball')) return 'best-ball'
  return 'redraft'
}

/**
 * Service layer for all league settings operations
 */
export class UnifiedLeagueSettingsService {
  /**
   * Get default settings for league creation
   */
  static resolveDefaultLeagueSettings(sport: SupportedLeagueSport, leagueType: LeagueType): UnifiedLeagueSettings {
    const service = LeagueSettingsEngineRegistry.getService(sport);
    return service.applyDefaultOnCreate(sport, leagueType);
  }

  /**
   * Get current league settings (from database)
   * In production, replace with actual DB call via Prisma
   */
  static async getLeagueSettings(leagueId: string): Promise<UnifiedLeagueSettings> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { settings: true, sport: true, leagueVariant: true, isDynasty: true },
    })
    if (!league) throw new Error(`League not found: ${leagueId}`)
    const raw = league.settings
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'meta' in raw) {
      return raw as unknown as UnifiedLeagueSettings
    }
    const leagueType = resolveLeagueTypeFromVariant(league.leagueVariant, league.isDynasty)
    return this.resolveDefaultLeagueSettings(league.sport as SupportedLeagueSport, leagueType)
  }

  /**
   * Update league settings with validation and audit
   */
  static async updateLeagueSettings(
    leagueId: string,
    page: LeagueSettingsPage,
    updates: Partial<UnifiedLeagueSettings>,
    userId: string,
    userPermissions: UserPermissions,
    options?: {
      validateOnly?: boolean;
      auditAction?: string;
    },
  ): Promise<{
    success: boolean;
    settings?: UnifiedLeagueSettings;
    validation: LeagueSettingsValidationResult;
    error?: string;
  }> {
    // Check permissions
    if (!LeagueSettingsPermissionsService.canAccessPage(userPermissions.role, page)) {
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [
            {
              field: 'permissions',
              page,
              message: LeagueSettingsPermissionsService.getPermissionDenialReason(
                userPermissions.role,
                page,
              ),
              severity: 'error',
            },
          ],
          warnings: [],
          impactedSystems: [],
          regenerationRequired: [],
          canSave: false,
        },
        error: 'Permission denied',
      };
    }

    // Get current settings
    const currentSettings = await this.getLeagueSettings(leagueId);

    // Validate updates
    const validation = LeagueSettingsValidationEngine.validatePageUpdate(
      currentSettings,
      updates,
      page,
      currentSettings.meta.sport,
    );

    if (!validation.canSave) {
      return {
        success: false,
        validation,
        error: 'Validation failed - cannot save with errors',
      };
    }

    // If validate-only, return here
    if (options?.validateOnly) {
      return {
        success: true,
        validation,
      };
    }

    // Merge updates
    const mergedSettings = this.mergeSettings(currentSettings, updates);

    // Create audit entry
    const auditEntry = this.createAuditEntry(
      userId,
      page,
      options?.auditAction || 'updated',
      Object.keys(updates),
      currentSettings,
      userPermissions.canAccessPremium,
    );

    // Increment version and append audit
    mergedSettings.audit.version += 1;
    mergedSettings.audit.changes.push(auditEntry);
    mergedSettings.audit.lastUpdatedAt = new Date();
    mergedSettings.audit.lastUpdatedBy = userId;

    // Trim audit log to 50 most recent entries
    if (mergedSettings.audit.changes.length > 50) {
      mergedSettings.audit.changes = mergedSettings.audit.changes.slice(-50);
    }

    // Persist to database
    await prisma.league.update({ where: { id: leagueId }, data: { settings: mergedSettings as any } })

    return {
      success: true,
      settings: mergedSettings,
      validation,
    };
  }

  /**
   * Reset league settings to default
   */
  static async resetLeagueSettingsToDefault(
    leagueId: string,
    userId: string,
    userPermissions: UserPermissions,
  ): Promise<{
    success: boolean;
    settings?: UnifiedLeagueSettings;
    error?: string;
  }> {
    // Only commissioner can reset
    if (!userPermissions.isCommissioner) {
      return {
        success: false,
        error: 'Only the commissioner can reset league settings',
      };
    }

    // Get current settings
    const currentSettings = await this.getLeagueSettings(leagueId);

    // Generate fresh defaults
    const defaultSettings = this.resolveDefaultLeagueSettings(
      currentSettings.meta.sport,
      currentSettings.meta.leagueType,
    );

    // Create reset audit entry
    const auditEntry = this.createAuditEntry(
      userId,
      'league',
      'reset',
      Object.keys(defaultSettings),
      currentSettings,
      false,
    );

    // Update audit
    defaultSettings.audit.version = currentSettings.audit.version + 1;
    defaultSettings.audit.changes = [...currentSettings.audit.changes, auditEntry];
    defaultSettings.audit.lastUpdatedAt = new Date();
    defaultSettings.audit.lastUpdatedBy = userId;

    // Trim audit log
    if (defaultSettings.audit.changes.length > 50) {
      defaultSettings.audit.changes = defaultSettings.audit.changes.slice(-50);
    }

    // Persist
    await prisma.league.update({ where: { id: leagueId }, data: { settings: defaultSettings as any } })

    return {
      success: true,
      settings: defaultSettings,
    };
  }

  /**
   * Normalize imported league settings
   */
  static async normalizeImportedLeagueSettings(
    leagueId: string,
    importedData: any,
    sourcePlatform: SourcePlatform,
    userId: string,
  ): Promise<{
    success: boolean;
    settings?: UnifiedLeagueSettings;
    warnings: string[];
    error?: string;
  }> {
    try {
      // Get current league
      // const league = await prisma.league.findUnique({where: {id: leagueId}})
      // if (!league) throw new Error('League not found')

      // Get service for the sport
      const service = LeagueSettingsEngineRegistry.getService('NFL'); // TODO: use actual sport
      const normalizedSettings = service.normalizeImportedSettings(importedData, sourcePlatform);

      // Create audit entry
      const auditEntry = this.createAuditEntry(
        userId,
        'league',
        'imported',
        Object.keys(normalizedSettings),
        normalizedSettings,
        false,
      );

      normalizedSettings.audit.changes = [auditEntry];
      normalizedSettings.audit.lastUpdatedAt = new Date();
      normalizedSettings.audit.lastUpdatedBy = userId;

      // Persist
      // TODO: await prisma.league.update({...})

      return {
        success: true,
        settings: normalizedSettings,
        warnings: normalizedSettings.importMetadata?.normalizationWarnings || [],
      };
    } catch (error) {
      return {
        success: false,
        warnings: [],
        error: error instanceof Error ? error.message : 'Unknown error during import normalization',
      };
    }
  }

  /**
   * Validate settings without saving
   */
  static async validateLeagueSettings(
    leagueId: string,
    updates: Partial<UnifiedLeagueSettings>,
  ): Promise<LeagueSettingsValidationResult> {
    const currentSettings = await this.getLeagueSettings(leagueId);
    const merged = this.mergeSettings(currentSettings, updates);
    return LeagueSettingsValidationEngine.validateSettings(merged, currentSettings.meta.sport);
  }

  /**
   * Compare settings to default template
   */
  static async compareToDefaultTemplate(leagueId: string): Promise<{
    matchesTemplate: boolean;
    diff: Record<string, { current: any; template: any }>;
  }> {
    const currentSettings = await this.getLeagueSettings(leagueId);
    const defaultSettings = this.resolveDefaultLeagueSettings(
      currentSettings.meta.sport,
      currentSettings.meta.leagueType,
    );

    const diff: Record<string, { current: any; template: any }> = {};
    let matches = true;

    // Deep compare all sections
    const sections = ['league', 'team', 'roster', 'scoring', 'draft', 'divisions'];
    for (const section of sections) {
      const currentSection = JSON.stringify(currentSettings[section as keyof UnifiedLeagueSettings]);
      const defaultSection = JSON.stringify(defaultSettings[section as keyof UnifiedLeagueSettings]);

      if (currentSection !== defaultSection) {
        matches = false;
        diff[section] = {
          current: JSON.parse(currentSection),
          template: JSON.parse(defaultSection),
        };
      }
    }

    return {
      matchesTemplate: matches,
      diff,
    };
  }

  // ===== PRIVATE HELPERS =====

  private static mergeSettings(
    current: UnifiedLeagueSettings,
    updates: Partial<UnifiedLeagueSettings>,
  ): UnifiedLeagueSettings {
    return {
      ...current,
      league: updates.league ? { ...current.league, ...updates.league } : current.league,
      team: updates.team ? { ...current.team, ...updates.team } : current.team,
      roster: updates.roster ? { ...current.roster, ...updates.roster } : current.roster,
      scoring: updates.scoring ? { ...current.scoring, ...updates.scoring } : current.scoring,
      draft: updates.draft ? { ...current.draft, ...updates.draft } : current.draft,
      divisions: updates.divisions ? { ...current.divisions, ...updates.divisions } : current.divisions,
      members: updates.members ? { ...current.members, ...updates.members } : current.members,
      coOwners: updates.coOwners ? { ...current.coOwners, ...updates.coOwners } : current.coOwners,
      commissionerControls: updates.commissionerControls
        ? { ...current.commissionerControls, ...updates.commissionerControls }
        : current.commissionerControls,
      schedule: updates.schedule ? { ...current.schedule, ...updates.schedule } : current.schedule,
    };
  }

  private static createAuditEntry(
    userId: string,
    page: LeagueSettingsPage,
    action: string,
    changedKeys: string[],
    previousSnapshot: UnifiedLeagueSettings | undefined,
    premiumUsed: boolean,
  ): LeagueSettingsAuditEntry {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action: action as any,
      page,
      changedKeys,
      premiumUsed,
      previousSnapshot: previousSnapshot ? { league: previousSnapshot.league } : undefined,
    };
  }
}
