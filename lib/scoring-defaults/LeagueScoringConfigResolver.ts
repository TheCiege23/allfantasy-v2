import { prisma } from '@/lib/prisma'
import {
  getLeagueSettingsForScoring,
  resolveFormatTypeFromLeagueSettings,
} from '@/lib/multi-sport/MultiSportScoringResolver'
import { resolveSportConfigForLeague } from '@/lib/multi-sport/SportConfigResolver'
import {
  getLeagueScoringRules,
  getScoringTemplate,
  type ScoringRuleDto,
} from '@/lib/multi-sport/ScoringTemplateResolver'
import { getLeagueScoringOverrides } from './ScoringOverrideService'

export interface LeagueScoringRuleConfig extends ScoringRuleDto {
  defaultPointsValue: number
  defaultEnabled: boolean
  isOverridden: boolean
}

export interface LeagueScoringConfig {
  leagueId: string
  sport: string
  leagueVariant: string | null
  formatType: string
  templateId: string
  rules: LeagueScoringRuleConfig[]
}

export async function getLeagueScoringConfig(
  leagueId: string
): Promise<LeagueScoringConfig | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true },
  })
  if (!league) return null

  const settings = await getLeagueSettingsForScoring(leagueId)
  const sportConfig = resolveSportConfigForLeague(league.sport)
  const formatType =
    resolveFormatTypeFromLeagueSettings(league.sport, settings) ??
    sportConfig.defaultFormat

  const [template, effectiveRules, overrides] = await Promise.all([
    getScoringTemplate(league.sport, formatType),
    getLeagueScoringRules(leagueId, league.sport, formatType),
    getLeagueScoringOverrides(leagueId),
  ])

  const templateRuleByKey = new Map(
    template.rules.map((rule) => [rule.statKey, rule])
  )
  const overrideByKey = new Map(overrides.map((o) => [o.statKey, o]))

  return {
    leagueId,
    sport: league.sport,
    leagueVariant: league.leagueVariant ?? null,
    formatType,
    templateId: template.templateId,
    rules: effectiveRules.map((rule) => {
      const defaultRule = templateRuleByKey.get(rule.statKey)
      return {
        ...rule,
        defaultPointsValue: defaultRule?.pointsValue ?? rule.pointsValue,
        defaultEnabled: defaultRule?.enabled ?? rule.enabled,
        isOverridden: overrideByKey.has(rule.statKey),
      }
    }),
  }
}
