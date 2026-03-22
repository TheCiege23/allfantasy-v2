/**
 * League scoring overrides: apply and persist league-specific scoring rule overrides.
 * Merged with template in getLeagueScoringRules; used when commissioner customizes scoring.
 */
import { prisma } from '@/lib/prisma'
import type { ScoringRuleDto } from '@/lib/multi-sport/ScoringTemplateResolver'
import { normalizeScoringStatKey } from './ScoringKeyAliasResolver'

export interface ScoringOverrideInput {
  statKey: string
  pointsValue: number
  enabled: boolean
}

/**
 * Get all overrides for a league.
 */
export async function getLeagueScoringOverrides(
  leagueId: string
): Promise<ScoringOverrideInput[]> {
  const rows = await prisma.leagueScoringOverride.findMany({
    where: { leagueId },
  })
  return rows.map((r) => ({
    statKey: r.statKey,
    pointsValue: r.pointsValue,
    enabled: r.enabled,
  }))
}

/**
 * Upsert overrides for a league (replace by statKey). Creates or updates rows.
 */
export async function upsertLeagueScoringOverrides(
  leagueId: string,
  overrides: ScoringOverrideInput[]
): Promise<void> {
  for (const o of overrides) {
    await prisma.leagueScoringOverride.upsert({
      where: {
        uniq_league_scoring_override_league_stat: { leagueId, statKey: o.statKey },
      },
      create: {
        leagueId,
        statKey: o.statKey,
        pointsValue: o.pointsValue,
        enabled: o.enabled,
      },
      update: {
        pointsValue: o.pointsValue,
        enabled: o.enabled,
      },
    })
  }
}

/**
 * Replace all overrides for a league in one operation.
 * Useful for commissioner settings screens that submit the full rule table.
 */
export async function replaceLeagueScoringOverrides(
  leagueId: string,
  overrides: ScoringOverrideInput[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.leagueScoringOverride.deleteMany({ where: { leagueId } })
    if (overrides.length === 0) return
    await tx.leagueScoringOverride.createMany({
      data: overrides.map((o) => ({
        leagueId,
        statKey: o.statKey,
        pointsValue: o.pointsValue,
        enabled: o.enabled,
      })),
    })
  })
}

/**
 * Merge template rules with league overrides (same logic as getLeagueScoringRules, for use in services).
 */
export function mergeRulesWithOverrides(
  templateRules: ScoringRuleDto[],
  overrides: ScoringOverrideInput[]
): ScoringRuleDto[] {
  const templateRuleKeys = new Set(templateRules.map((r) => r.statKey))
  const overrideMap = new Map<string, ScoringOverrideInput>()
  for (const o of overrides) {
    const canonical = normalizeScoringStatKey(o.statKey, {
      templateRuleKeys,
    })
    if (!templateRuleKeys.has(canonical)) continue
    overrideMap.set(canonical, o)
  }
  return templateRules.map((r) => {
    const ov = overrideMap.get(r.statKey)
    if (ov) {
      return {
        statKey: r.statKey,
        pointsValue: ov.pointsValue,
        multiplier: r.multiplier,
        enabled: ov.enabled,
      }
    }
    return r
  })
}
