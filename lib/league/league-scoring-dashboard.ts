import 'server-only'

import type { LeagueScoringConfig, LeagueScoringRuleConfig } from '@/lib/scoring-defaults/LeagueScoringConfigResolver'
import { resolveScoringStatDisplay } from '@/lib/league/scoring-stat-metadata'
import type {
  LeagueScoringDashboardSummary,
  LeagueScoringRow,
  LeagueScoringSection,
} from '@/app/league/[leagueId]/league-dashboard-types'

function isYardLikeStatKey(statKey: string): boolean {
  const sk = statKey.toLowerCase()
  return sk.includes('yards') || sk.includes('_yard')
}

function isMinutesLikeStatKey(statKey: string): boolean {
  const sk = statKey.toLowerCase()
  return sk.includes('minutes') || sk === 'seconds_played'
}

function isReceptionStatKey(statKey: string): boolean {
  const sk = statKey.toLowerCase()
  return sk === 'receptions' || sk === 'reception'
}

/**
 * Show compact dashboard rows: non-zero scoring, yard/reception structural stats, and minute-per-point stats.
 */
function shouldIncludeRule(rule: LeagueScoringRuleConfig): boolean {
  if (!rule.enabled) return false
  const eff = rule.pointsValue * (rule.multiplier ?? 1)
  if (Math.abs(eff) >= 1e-9) return true
  if (isYardLikeStatKey(rule.statKey)) return true
  if (isReceptionStatKey(rule.statKey)) return true
  if (isMinutesLikeStatKey(rule.statKey)) return true
  return false
}

function isNonStandardRule(rule: LeagueScoringRuleConfig): boolean {
  return (
    Math.abs(rule.pointsValue - rule.defaultPointsValue) > 0.0001 ||
    rule.enabled !== rule.defaultEnabled
  )
}

function formatSignedNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  const t = Math.round(n * 1000) / 1000
  return String(t)
}

function formatScoringValue(rule: LeagueScoringRuleConfig): { text: string; tone: 'positive' | 'negative' | 'neutral' } {
  const m = rule.multiplier ?? 1
  const eff = rule.pointsValue * m
  const sk = rule.statKey.toLowerCase()

  if (isYardLikeStatKey(rule.statKey) && Math.abs(eff) > 1e-12 && Math.abs(eff) < 10) {
    const ypp = Math.round(1 / Math.abs(eff))
    const sign = eff >= 0 ? '+' : '−'
    const absEff = Math.abs(eff)
    const coef =
      absEff >= 0.01
        ? absEff.toFixed(2).replace(/\.?0+$/, '')
        : absEff.toFixed(4).replace(/\.?0+$/, '')
    return {
      text: `${sign}${coef} per yard (${ypp} yards = 1 point)`,
      tone: eff > 0 ? 'positive' : eff < 0 ? 'negative' : 'neutral',
    }
  }

  if (isMinutesLikeStatKey(rule.statKey) && Math.abs(eff) > 1e-12 && Math.abs(eff) < 1) {
    const perPoint = Math.round(1 / Math.abs(eff))
    const sign = eff >= 0 ? '+' : '−'
    const absEff = Math.abs(eff)
    const coef = absEff.toFixed(4).replace(/\.?0+$/, '')
    const unit = sk.includes('seconds') ? 'seconds' : 'minutes'
    return {
      text: `${sign}${coef} per ${unit.replace(/s$/, '')} (${perPoint} ${unit} = 1 point)`,
      tone: eff > 0 ? 'positive' : eff < 0 ? 'negative' : 'neutral',
    }
  }

  const rounded = Math.round(eff * 1000) / 1000
  if (Math.abs(rounded) < 1e-12) {
    return { text: '+0', tone: 'neutral' }
  }
  const tone: 'positive' | 'negative' | 'neutral' =
    rounded > 0 ? 'positive' : rounded < 0 ? 'negative' : 'neutral'
  const sign = rounded > 0 ? '+' : ''
  return { text: `${sign}${formatSignedNumber(rounded)}`, tone }
}

/**
 * Build grouped scoring rows for the league dashboard from merged template + overrides.
 */
export function buildLeagueScoringDashboardSummary(
  config: LeagueScoringConfig,
): LeagueScoringDashboardSummary {
  const sport = config.sport

  const rows: Array<
    LeagueScoringRow & {
      _catOrder: number
      _catTitle: string
      _templateIndex: number
    }
  > = []

  config.rules.forEach((rule, templateIndex) => {
    if (!shouldIncludeRule(rule)) return
    const meta = resolveScoringStatDisplay(rule.statKey, sport)
    const { text, tone } = formatScoringValue(rule)
    const highlight = isNonStandardRule(rule)
    rows.push({
      label: meta.label,
      value: text,
      valueTone: tone,
      highlight,
      _catOrder: meta.categoryOrder,
      _catTitle: meta.categoryTitle,
      _templateIndex: templateIndex,
    })
  })

  const bySection = new Map<string, typeof rows>()
  for (const row of rows) {
    const title = row._catTitle
    const list = bySection.get(title) ?? []
    list.push(row)
    bySection.set(title, list)
  }

  const sectionEntries = [...bySection.entries()].map(([title, list]) => ({
    title,
    order: Math.min(...list.map((r) => r._catOrder)),
    rows: list
      .sort((a, b) => a._templateIndex - b._templateIndex)
      .map(({ _catOrder: _o, _catTitle: _t, _templateIndex: _i, ...rest }) => rest),
  }))

  sectionEntries.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.title.localeCompare(b.title)
  })

  const sections: LeagueScoringSection[] = sectionEntries.map((s) => ({
    title: s.title,
    rows: s.rows,
  }))

  const nonStandardCount = config.rules.filter(
    (r) => shouldIncludeRule(r) && isNonStandardRule(r),
  ).length

  return {
    sport,
    formatType: config.formatType,
    templateId: config.templateId,
    nonStandardCount,
    sections,
  }
}
