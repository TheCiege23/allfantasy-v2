/**
 * Resolves the waiver preset (defaults) for a given sport and league variant.
 * Used by league creation, waiver UI, and processing config.
 */
import { getWaiverPreset } from './WaiverDefaultsRegistry'
import type { WaiverDefaults } from '@/lib/sport-defaults/types'

export interface WaiverPresetResult {
  preset: WaiverDefaults
  sport: string
  variant: string | null
  supportsIdpClaims: boolean
  supportsFaab: boolean
  defaultClaimPriority: string
}

/**
 * Resolve waiver preset by sport and optional variant.
 */
export function resolveWaiverPreset(
  sport: string,
  variant?: string | null
): WaiverPresetResult {
  const preset = getWaiverPreset(sport, variant ?? undefined)
  const sportUpper = String(sport).toUpperCase()
  const variantUpper = String(variant ?? '').toUpperCase()
  const supportsIdpClaims = sportUpper === 'NFL' && (variantUpper === 'IDP' || variantUpper === 'DYNASTY_IDP')
  const supportsFaab = preset.waiver_type === 'faab' || preset.faab_enabled === true
  return {
    preset,
    sport,
    variant: variant ?? null,
    supportsIdpClaims,
    supportsFaab,
    defaultClaimPriority: String(preset.claim_priority_behavior ?? 'faab_highest'),
  }
}
