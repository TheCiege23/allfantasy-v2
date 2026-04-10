/**
 * AI Rule Validation Engine
 *
 * Ensures custom scoring rules, league structures, and roster settings
 * are logically valid and consistent. Catches configuration errors
 * before they affect gameplay.
 *
 * From PDF: "Essential AI Feature #1 — League Management"
 */

import { prisma } from '@/lib/prisma'

export type RuleValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  category: 'scoring' | 'roster' | 'schedule' | 'waiver' | 'trade' | 'playoff' | 'format'
  message: string
  field: string | null
  suggestion: string | null
}

export type RuleValidationResult = {
  isValid: boolean
  issues: RuleValidationIssue[]
  score: number // 0-100 quality score
}

/**
 * Validate all league settings for logical consistency.
 */
export async function validateLeagueRules(leagueId: string): Promise<RuleValidationResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, teamCount: true, sport: true, isDynasty: true },
  })
  if (!league) return { isValid: false, issues: [{ severity: 'error', category: 'format', message: 'League not found', field: null, suggestion: null }], score: 0 }

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const issues: RuleValidationIssue[] = []

  // Roster validation
  const rosterSize = Number(settings.roster_size ?? 15)
  const teamCount = league.teamCount ?? 12
  if (rosterSize < 5) {
    issues.push({ severity: 'error', category: 'roster', message: 'Roster size too small (minimum 5)', field: 'roster_size', suggestion: 'Set roster size to at least 10' })
  }
  if (rosterSize > 50) {
    issues.push({ severity: 'warning', category: 'roster', message: 'Very large roster size may affect waiver pool depth', field: 'roster_size', suggestion: 'Consider reducing to 25-30 for better waiver activity' })
  }

  // Team count validation
  if (teamCount < 4) {
    issues.push({ severity: 'error', category: 'format', message: 'Minimum 4 teams required', field: 'teamCount', suggestion: 'Invite more managers' })
  }
  if (teamCount > 32) {
    issues.push({ severity: 'error', category: 'format', message: 'Maximum 32 teams supported', field: 'teamCount', suggestion: 'Reduce team count' })
  }

  // Playoff validation
  const playoffTeams = Number(settings.playoff_team_count ?? 6)
  const playoffStart = Number(settings.playoff_start_week ?? 15)
  if (playoffTeams >= teamCount) {
    issues.push({ severity: 'error', category: 'playoff', message: 'Playoff teams cannot equal or exceed total teams', field: 'playoff_team_count', suggestion: `Set to ${Math.floor(teamCount / 2)} or fewer` })
  }
  if (playoffTeams > teamCount * 0.75) {
    issues.push({ severity: 'warning', category: 'playoff', message: 'More than 75% of teams make playoffs — reduces regular season stakes', field: 'playoff_team_count', suggestion: `Consider ${Math.ceil(teamCount / 2)} playoff teams` })
  }

  // Scoring validation
  const scoringFormat = String(settings.scoring_format ?? 'ppr')
  if (!['ppr', 'half_ppr', 'standard', 'points', 'categories', 'IDP'].includes(scoringFormat)) {
    issues.push({ severity: 'warning', category: 'scoring', message: `Unknown scoring format: ${scoringFormat}`, field: 'scoring_format', suggestion: 'Use ppr, half_ppr, or standard' })
  }

  // Waiver validation
  const waiverType = String(settings.waiver_type ?? 'faab')
  const faabBudget = Number(settings.faab_budget ?? 100)
  if (waiverType === 'faab' && (faabBudget < 10 || faabBudget > 10000)) {
    issues.push({ severity: 'warning', category: 'waiver', message: `FAAB budget of $${faabBudget} may be unusual`, field: 'faab_budget', suggestion: 'Standard FAAB is $100-$200' })
  }

  // Trade deadline validation
  const tradeDeadline = Number(settings.trade_deadline_week ?? 0)
  if (tradeDeadline > 0 && tradeDeadline >= playoffStart) {
    issues.push({ severity: 'error', category: 'trade', message: 'Trade deadline cannot be during or after playoffs', field: 'trade_deadline_week', suggestion: `Set before week ${playoffStart}` })
  }

  // Schedule validation
  const regularWeeks = Number(settings.regular_season_length ?? 14)
  if (regularWeeks < 6) {
    issues.push({ severity: 'warning', category: 'schedule', message: 'Very short season may increase randomness', field: 'regular_season_length', suggestion: 'Consider 12-14 weeks for NFL' })
  }

  // Dynasty-specific
  if (league.isDynasty) {
    const taxiSlots = Number(settings.taxi_slots ?? settings.taxiSlots ?? 0)
    if (taxiSlots > 10) {
      issues.push({ severity: 'warning', category: 'roster', message: 'More than 10 taxi slots is unusual', field: 'taxi_slots', suggestion: 'Standard is 3-6 taxi slots' })
    }
  }

  // Calculate quality score
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  const score = Math.max(0, 100 - errors * 25 - warnings * 10)

  return {
    isValid: errors === 0,
    issues,
    score,
  }
}
