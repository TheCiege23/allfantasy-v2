import type { LineupDecisionMode, PremiumPlayerSignals, TeamContextInput, UserLineupPreferenceProfileInput } from './types'
import type { LeagueContextInput } from './types'

const W = {
  projection: 0.22,
  matchup: 0.16,
  usage: 0.16,
  role: 0.1,
  form: 0.08,
  health: 0.1,
  ceiling: 0.08,
  floor: 0.05,
  schedule: 0.05,
} as const

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

function scaleProjectionToScore(projectedPoints: number, leagueCeiling = 35): number {
  if (!Number.isFinite(projectedPoints)) return 50
  const t = clamp01(projectedPoints / Math.max(1, leagueCeiling))
  return t * 100
}

function defaultComponent(value: number | undefined, projectedFallback: number): number {
  if (value != null && Number.isFinite(value)) return clamp01(value / 100) * 100
  return projectedFallback
}

export interface ModifierContext {
  lineupMode: LineupDecisionMode
  team?: TeamContextInput
  league?: LeagueContextInput
  preference?: UserLineupPreferenceProfileInput
}

function leagueFormatModifier(league?: LeagueContextInput): number {
  if (!league?.format) return 0
  const f = String(league.format).toLowerCase()
  if (f === 'guillotine') return 4
  if (f === 'survivor' || f === 'zombie' || f === 'tournament') return 3
  if (f === 'dynasty' || f === 'devy') return -1
  if (f === 'best_ball') return league.bestBallNoManualLineup ? -2 : 0
  return 0
}

function scoringModifier(league?: LeagueContextInput): number {
  let m = 0
  if (league?.superflex) m += 1
  if (league?.tePremium) m += 0.5
  if (league?.ppc) m += 0.5
  if (league?.idp) m += 0.5
  return m
}

function opponentModifier(team?: TeamContextInput): number {
  if (team?.opponentStrength == null || !Number.isFinite(team.opponentStrength)) return 0
  return (clamp01(team.opponentStrength) - 0.5) * 6
}

function playoffUrgencyModifier(team?: TeamContextInput): number {
  if (team?.isPlayoffWeek) return 2
  if (team?.weeksUntilPlayoffs != null && team.weeksUntilPlayoffs <= 2) return 1.5
  return 0
}

function userStrategyModifier(mode: LineupDecisionMode, team?: TeamContextInput): number {
  const dir = team?.teamDirection
  if (mode === 'Underdog Lineup' && dir === 'underdog') return 2
  if (mode === 'Playoff-Protect Lineup' && dir === 'favorite') return 2
  if (mode === 'Must-Win Lineup' && (dir === 'bubble' || dir === 'underdog')) return 2
  return 0
}

function userPreferenceModifier(
  preference: UserLineupPreferenceProfileInput | undefined,
  signals: PremiumPlayerSignals,
  weeklyRaw: number
): number {
  if (!preference?.preferenceWeight || preference.preferenceWeight <= 0) return 0
  const w = clamp01(preference.preferenceWeight) * 3
  let delta = 0
  if (preference.prefersHighCeiling && signals.ceilingScore != null) {
    delta += (clamp01(signals.ceilingScore / 100) - 0.5) * 2 * w
  }
  if (preference.prefersStableVeterans && signals.isVeteran) delta += 0.8 * w
  if (preference.prefersRookies && signals.isRookie) delta += 0.5 * w
  if (preference.prefersTeamLoyalty) delta += 0
  if (preference.prefersConsistency && signals.floorScore != null) {
    delta += (clamp01(signals.floorScore / 100) - 0.5) * 1.5 * w
  }
  if (preference.prefersMatchupChasing != null && preference.prefersMatchupChasing > 0 && signals.matchupScore != null) {
    delta +=
      (clamp01(signals.matchupScore / 100) - 0.5) *
      1.2 *
      w *
      clamp01(preference.prefersMatchupChasing)
  }
  return delta * (1 / (1 + Math.abs(weeklyRaw - 50) / 50))
}

export function computeWeeklyStartScore(
  projectedPoints: number,
  signals: PremiumPlayerSignals,
  ctx: ModifierContext
): {
  weeklyStartScoreRaw: number
  weeklyStartScore: number
  volatilityScore: number
  startConfidence: number
  benchCost: number
  swapPriority: number
  components: Record<string, number>
} {
  const proj = scaleProjectionToScore(projectedPoints)
  const projectionScore = defaultComponent(signals.projectionScore, proj)
  const matchupScore = defaultComponent(signals.matchupScore, proj * 0.95 + 2.5)
  const usageOpportunityScore = defaultComponent(signals.usageOpportunityScore, proj * 0.92 + 4)
  const roleSecurityScore = defaultComponent(signals.roleSecurityScore, proj * 0.9 + 5)
  const recentFormScore = defaultComponent(signals.recentFormScore, proj * 0.94 + 3)
  const healthAvailabilityScore = defaultComponent(signals.healthAvailabilityScore, proj * 0.88 + 6)
  const ceilingScore = defaultComponent(
    signals.ceilingScore,
    signals.ceilingProjection != null ? scaleProjectionToScore(signals.ceilingProjection) : proj + 8
  )
  const floorScore = defaultComponent(
    signals.floorScore,
    signals.floorProjection != null ? scaleProjectionToScore(signals.floorProjection) : proj - 8
  )
  const scheduleEnvironmentScore = defaultComponent(signals.scheduleEnvironmentScore, proj * 0.93 + 3.5)

  const weeklyStartScoreRaw =
    projectionScore * W.projection +
    matchupScore * W.matchup +
    usageOpportunityScore * W.usage +
    roleSecurityScore * W.role +
    recentFormScore * W.form +
    healthAvailabilityScore * W.health +
    ceilingScore * W.ceiling +
    floorScore * W.floor +
    scheduleEnvironmentScore * W.schedule

  const mod =
    leagueFormatModifier(ctx.league) +
    scoringModifier(ctx.league) +
    opponentModifier(ctx.team) +
    playoffUrgencyModifier(ctx.team) +
    userStrategyModifier(ctx.lineupMode, ctx.team) +
    userPreferenceModifier(ctx.preference, signals, weeklyStartScoreRaw)

  const weeklyStartScore = Math.max(0, Math.min(100, weeklyStartScoreRaw + mod))

  const vol =
    Math.abs(ceilingScore - floorScore) * 0.35 +
    Math.max(0, 50 - healthAvailabilityScore) * 0.4 +
    Math.max(0, 50 - roleSecurityScore) * 0.25

  const volatilityScore = Math.max(0, Math.min(100, vol))

  const startConfidence = Math.max(
    0,
    Math.min(
      100,
      weeklyStartScore * 0.55 + healthAvailabilityScore * 0.25 + (100 - volatilityScore) * 0.2
    )
  )

  const benchCost = Math.max(0, ceilingScore - floorScore) * 0.15 + Math.max(0, 60 - weeklyStartScore) * 0.4

  const swapPriority = benchCost * 0.6 + volatilityScore * 0.25 + (signals.byeWeek ? 15 : 0)

  return {
    weeklyStartScoreRaw,
    weeklyStartScore,
    volatilityScore,
    startConfidence,
    benchCost,
    swapPriority,
    components: {
      projectionScore,
      matchupScore,
      usageOpportunityScore,
      roleSecurityScore,
      recentFormScore,
      healthAvailabilityScore,
      ceilingScore,
      floorScore,
      scheduleEnvironmentScore,
    },
  }
}

export function modeEffectiveObjectiveScore(
  mode: LineupDecisionMode,
  weekly: number,
  floor: number,
  ceiling: number,
  volatility: number,
  projectedPoints: number
): number {
  const w = weekly
  const f = floor
  const c = ceiling
  const v = volatility
  const p = projectedPoints

  switch (mode) {
    case 'Safe Lineup':
      return w * 0.55 + f * 0.35 + p * 0.1 - v * 0.08
    case 'Upside Lineup':
      return w * 0.45 + c * 0.45 + p * 0.1
    case 'Must-Win Lineup':
      return w * 0.5 + c * 0.35 + p * 0.15 - v * 0.03
    case 'Underdog Lineup':
      return w * 0.35 + c * 0.5 + p * 0.15 - v * 0.02
    case 'Playoff-Protect Lineup':
      return w * 0.6 + f * 0.3 + p * 0.1 - v * 0.1
    case 'Dynasty Development Lineup':
      return w * 0.65 + f * 0.15 + c * 0.1 + p * 0.1 + (volatility < 40 ? 2 : 0)
    case 'Injury Contingency Lineup':
      return w * 0.5 + f * 0.35 + p * 0.15 - v * 0.05
    case 'Best Lineup':
    default:
      return w * 0.65 + p * 0.2 + f * 0.1 + c * 0.05 - v * 0.04
  }
}
