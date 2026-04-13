/**
 * components/league-settings/types.ts
 * Shared types for league settings UI components
 */

import { UnifiedLeagueSettings, LeagueSettingsValidationError, LeagueSettingsPage, UserPermissions } from '@/lib/league-settings-engine';

export interface LeagueSettingsSection {
  key: string;
  label: string;
  description?: string;
}

export interface SettingsRowProps {
  label: string;
  description?: string;
  value: any;
  readOnly: boolean;
  required?: boolean;
  error?: string;
  warning?: string;
  premium?: boolean;
  onPremiumClick?: () => void;
}

export interface SettingsValidationBannerProps {
  errors: LeagueSettingsValidationError[];
  warnings: LeagueSettingsValidationError[];
  canSave: boolean;
}

export interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  validationStatus?: 'valid' | 'warning' | 'error';
}

export interface LeagueSettingsModalProps {
  leagueId: string;
  onClose: () => void;
  initialPage?: LeagueSettingsPage;
}
