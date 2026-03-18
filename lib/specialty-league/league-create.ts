/**
 * League create integration: bootstrap specialty config and return suggested avatar/variant.
 * Use from app/api/league/create/route.ts when leagueType or leagueVariant matches a specialty.
 *
 * PROMPT 336 — Specialty League Factory.
 */

import { getSpecialtySpecByWizardType, getSpecialtySpecByVariant } from './registry'
import type { SpecialtyLeagueSpec } from './types'

export interface SpecialtyBootstrapResult {
  leagueVariant: string
  avatarUrl: string | null
  spec: SpecialtyLeagueSpec
}

/**
 * If the given wizard league type or variant is a registered specialty, return variant, avatar, and spec.
 * Caller should set League.leagueVariant and League.avatarUrl, then call bootstrapSpecialtyConfig(leagueId, spec).
 */
export function getSpecialtyBootstrapForCreate(
  wizardLeagueType: string | null,
  leagueVariantInput: string | null
): SpecialtyBootstrapResult | null {
  const spec =
    getSpecialtySpecByWizardType(wizardLeagueType ?? '') ??
    getSpecialtySpecByVariant(leagueVariantInput ?? '')
  if (!spec) return null

  const assets = typeof spec.assets === 'function' ? spec.assets() : spec.assets
  return {
    leagueVariant: spec.leagueVariant,
    avatarUrl: assets.leagueImage ?? null,
    spec,
  }
}

/**
 * After creating a league, call this to upsert the specialty config (e.g. GuillotineLeagueConfig).
 */
export async function bootstrapSpecialtyConfig(
  leagueId: string,
  spec: SpecialtyLeagueSpec,
  input?: Record<string, unknown>
): Promise<void> {
  if (!spec.upsertConfig) return
  await spec.upsertConfig(leagueId, input ?? {})
}
