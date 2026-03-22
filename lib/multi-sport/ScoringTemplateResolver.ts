/**
 * Resolves scoring template by sport/format and league overrides.
 * Used by MultiSportScoringResolver and matchup scoring.
 * In-memory defaults for all sports come from ScoringDefaultsRegistry.
 */
import { prisma } from '@/lib/prisma'
import { toSportType, type SportType } from './sport-types'
import { getDefaultScoringTemplate } from '@/lib/scoring-defaults/ScoringDefaultsRegistry'
import { normalizeScoringStatKey } from '@/lib/scoring-defaults/ScoringKeyAliasResolver'

export interface ScoringRuleDto {
  statKey: string
  pointsValue: number
  multiplier: number
  enabled: boolean
}

export interface ScoringTemplateDto {
  templateId: string
  sportType: SportType
  name: string
  formatType: string
  rules: ScoringRuleDto[]
}

export async function getScoringTemplate(
  sportType: SportType | string,
  formatType: string = 'standard'
): Promise<ScoringTemplateDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const template = await prisma.scoringTemplate.findUnique({
    where: {
      uniq_scoring_template_sport_format: { sportType: sport, formatType },
    },
    include: { rules: true },
  })
  if (template) {
    return {
      templateId: template.id,
      sportType: sport,
      name: template.name,
      formatType: template.formatType,
      rules: template.rules.map((r) => ({
        statKey: r.statKey,
        pointsValue: r.pointsValue,
        multiplier: r.multiplier,
        enabled: r.enabled,
      })),
    }
  }
  const defaultTemplate = getDefaultScoringTemplate(sport, formatType)
  return {
    templateId: defaultTemplate.templateId,
    sportType: defaultTemplate.sportType as SportType,
    name: defaultTemplate.name,
    formatType: defaultTemplate.formatType,
    rules: defaultTemplate.rules,
  }
}

/**
 * Get effective scoring rules for a league: template rules merged with league overrides.
 */
export async function getLeagueScoringRules(
  leagueId: string,
  sportType: SportType | string,
  formatType: string = 'standard'
): Promise<ScoringRuleDto[]> {
  const template = await getScoringTemplate(sportType, formatType)
  const overrides = await prisma.leagueScoringOverride.findMany({
    where: { leagueId },
  })
  const templateRuleKeys = new Set(template.rules.map((r) => r.statKey))
  const overrideMap = new Map<string, (typeof overrides)[number]>()
  for (const o of overrides) {
    const canonical = normalizeScoringStatKey(o.statKey, {
      sportType: typeof sportType === 'string' ? sportType : String(sportType),
      templateRuleKeys,
    })
    if (!templateRuleKeys.has(canonical)) continue
    overrideMap.set(canonical, o)
  }
  return template.rules.map((r) => {
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
