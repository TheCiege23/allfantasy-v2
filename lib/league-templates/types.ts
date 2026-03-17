/**
 * League template payload: wizard-compatible state (no step).
 * Used to prefill the creation wizard and to merge into League.settings at create.
 */

import type {
  LeagueTypeId,
  DraftTypeId,
  WizardDraftSettings,
  WizardAISettings,
  WizardAutomationSettings,
  WizardPrivacySettings,
} from '@/lib/league-creation-wizard/types'

export interface LeagueTemplatePayload {
  sport: string
  leagueType: LeagueTypeId
  draftType: DraftTypeId
  name: string
  teamCount: number
  rosterSize: number | null
  scoringPreset: string | null
  leagueVariant: string | null
  draftSettings: WizardDraftSettings
  aiSettings: WizardAISettings
  automationSettings: WizardAutomationSettings
  privacySettings: WizardPrivacySettings
}

export type LeagueTemplatePayloadJson = Record<string, unknown>
