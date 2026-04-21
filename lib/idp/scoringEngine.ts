/**
 * IDP fantasy scoring — apply league preset + overrides to canonical `idp_*` stat lines.
 * NFL only. Pure math + optional Prisma load via `getIdpLeagueConfig`.
 *
 * Commissioner edits persist to `LeagueScoringOverride` and merge in `getLeagueScoringRules`.
 * `getMergedScoringRulesForLeague` overlays those effective `idp_*` rules so IDP surfaces
 * (scores API, Chimmy) stay aligned with the main weekly scoring pipeline.
 */

import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getIdpLeagueConfig } from '@/lib/idp/IDPLeagueConfig'
import { getIdpPresetScoring } from '@/lib/idp/IDPScoringPresets'
import type { IdpScoringOverrides } from '@/lib/idp/types'
import type { IdpWeeklyStatLine } from '@/lib/idp/statIngestionEngine'
import { resolveScoringRulesForLeague } from '@/lib/multi-sport/MultiSportScoringResolver'

export type IdpFantasyPointsResult = {
  total: number
  /** Per-stat fantasy points contributed (stat key → points). */
  breakdown: Record<string, number>
}

function mergeOverrides(presetValues: Record<string, number>, overrides: IdpScoringOverrides | null): Record<string, number> {
  if (!overrides || Object.keys(overrides).length === 0) return { ...presetValues }
  return { ...presetValues, ...overrides }
}

/**
 * Merge preset scoring from `getIdpPresetScoring` with optional league overrides.
 */
export function mergeIdpScoringRules(preset: string, overrides?: IdpScoringOverrides | null): Record<string, number> {
  const base = getIdpPresetScoring(preset)
  return mergeOverrides(base, overrides ?? null)
}

/**
 * Load `IdpLeagueConfig` scoring preset + legacy JSON overrides, then overlay commissioner
 * template rules from `LeagueScoringOverride` for every `idp_*` stat key.
 */
export async function getMergedScoringRulesForLeague(leagueId: string): Promise<Record<string, number>> {
  const cfg = await getIdpLeagueConfig(leagueId)
  const preset = cfg?.scoringPreset ?? 'balanced'
  const base = getIdpPresetScoring(preset)
  const merged = mergeOverrides(base, cfg?.scoringOverrides ?? null)

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  if (!league?.sport) return merged

  const rules = await resolveScoringRulesForLeague(leagueId, league.sport as LeagueSport)
  const out = { ...merged }
  for (const r of rules) {
    if (!r.statKey.startsWith('idp_')) continue
    const mult = r.multiplier ?? 1
    out[r.statKey] = r.enabled ? r.pointsValue * mult : 0
  }
  return out
}

/**
 * Sum fantasy points for one week from a stat line and league rules.
 */
export function computeIdpFantasyPoints(line: IdpWeeklyStatLine, rules: Record<string, number>): IdpFantasyPointsResult {
  let total = 0
  const breakdown: Record<string, number> = {}
  for (const [statKey, ptsPer] of Object.entries(rules)) {
    if (!Number.isFinite(ptsPer) || ptsPer === 0) continue
    const n = typeof line[statKey] === 'number' && Number.isFinite(line[statKey] as number) ? (line[statKey] as number) : 0
    const contrib = n * ptsPer
    if (Math.abs(contrib) > 1e-9) {
      breakdown[statKey] = contrib
      total += contrib
    }
  }
  return { total, breakdown }
}
