/**
 * Resolves the draft preset (defaults) for a given sport and league variant.
 * Used by league creation, draft room config, and AI draft context.
 */
import { getDraftPreset } from './DraftDefaultsRegistry'
import type { DraftDefaults } from '@/lib/sport-defaults/types'

export interface DraftPresetResult {
  preset: DraftDefaults
  sport: string
  variant: string | null
  supportsIdpPlayers: boolean
  supportsKeeperCarryover: boolean
  defaultOrderMode: 'snake' | 'linear'
}

/**
 * Resolve draft preset by sport and optional variant.
 * NFL IDP / DYNASTY_IDP get IDP-specific rounds and queue limits.
 */
export function resolveDraftPreset(
  sport: string,
  variant?: string | null
): DraftPresetResult {
  const preset = getDraftPreset(sport, variant ?? undefined)
  const variantUpper = String(variant ?? '').toUpperCase()
  const sportUpper = String(sport).toUpperCase()
  const supportsIdpPlayers = sportUpper === 'NFL' && (variantUpper === 'IDP' || variantUpper === 'DYNASTY_IDP')
  return {
    preset,
    sport,
    variant: variant ?? null,
    supportsIdpPlayers,
    supportsKeeperCarryover: Boolean(preset.keeper_dynasty_carryover_supported),
    defaultOrderMode: (preset.snake_or_linear_behavior ?? preset.pick_order_rules) === 'linear' ? 'linear' : 'snake',
  }
}
