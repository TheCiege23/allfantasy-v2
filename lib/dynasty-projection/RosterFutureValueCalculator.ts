import type {
  PlayerDynastyAsset,
  DynastyLeagueContext,
  RosterFutureValueBreakdown,
} from './types'

type Horizon = 'next' | 'three' | 'five'

function ageMultiplier(position: string, age: number | null, horizon: Horizon): number {
  if (!age || age <= 0) return 1
  const pos = position.toUpperCase()

  const targetAge: Record<string, { peakStart: number; peakEnd: number; hardCliff: number }> = {
    QB: { peakStart: 27, peakEnd: 33, hardCliff: 38 },
    RB: { peakStart: 23, peakEnd: 26, hardCliff: 29 },
    WR: { peakStart: 25, peakEnd: 30, hardCliff: 33 },
    TE: { peakStart: 26, peakEnd: 30, hardCliff: 33 },
  }
  const cfg = targetAge[pos] ?? { peakStart: 25, peakEnd: 29, hardCliff: 32 }

  const horizonOffset: Record<Horizon, number> = {
    next: 0,
    three: 2,
    five: 4,
  }

  const effAge = age + horizonOffset[horizon]

  if (effAge < cfg.peakStart - 2) {
    return 0.85 + (effAge / (cfg.peakStart - 2)) * 0.15
  }
  if (effAge <= cfg.peakEnd) {
    return 1.0
  }
  if (effAge >= cfg.hardCliff) {
    return 0.4
  }

  const t = (effAge - cfg.peakEnd) / (cfg.hardCliff - cfg.peakEnd)
  return 1.0 - t * 0.6
}

function positionScarcityMultiplier(position: string, ctx: DynastyLeagueContext): number {
  const pos = position.toUpperCase()
  if (pos === 'QB') return ctx.isSuperFlex ? 1.3 : 1.0
  if (pos === 'TE') return ctx.isTightEndPremium ? 1.15 : 1.0
  return 1.0
}

export function calculateRosterFutureValue(
  players: PlayerDynastyAsset[],
  ctx: DynastyLeagueContext,
): RosterFutureValueBreakdown {
  if (!players.length) {
    return {
      nextYearStrength: 0,
      threeYearStrength: 0,
      fiveYearStrength: 0,
      agingRiskScore: 0,
      injuryRiskScore: 0,
    }
  }

  let nextSum = 0
  let threeSum = 0
  let fiveSum = 0
  let ageWeighted = 0
  let injuryWeighted = 0
  let totalDynasty = 0

  for (const p of players) {
    const base = Math.max(0, p.dynastyValue)
    if (!base) continue
    const scarcity = positionScarcityMultiplier(p.position, ctx)

    const mNext = ageMultiplier(p.position, p.age ?? null, 'next') * scarcity
    const mThree = ageMultiplier(p.position, p.age ?? null, 'three') * scarcity
    const mFive = ageMultiplier(p.position, p.age ?? null, 'five') * scarcity

    nextSum += base * mNext
    threeSum += base * mThree
    fiveSum += base * mFive

    const ageForRisk = p.age ?? 26
    const pos = p.position.toUpperCase()
    let ageRisk = 0
    if (pos === 'RB') {
      ageRisk = Math.max(0, ageForRisk - 25) * 4
    } else if (pos === 'WR') {
      ageRisk = Math.max(0, ageForRisk - 28) * 2.5
    } else if (pos === 'TE') {
      ageRisk = Math.max(0, ageForRisk - 28) * 2
    } else if (pos === 'QB') {
      ageRisk = Math.max(0, ageForRisk - 33) * 1.5
    }

    const injuryScore = p.recentInjuryScore ?? 0

    ageWeighted += ageRisk * base
    injuryWeighted += injuryScore * base
    totalDynasty += base
  }

  const normalize = (v: number) => Math.round(v)
  const agingRiskScore =
    totalDynasty > 0 ? Math.min(100, Math.max(0, (ageWeighted / totalDynasty))) : 0
  const injuryRiskScore =
    totalDynasty > 0 ? Math.min(100, Math.max(0, (injuryWeighted / totalDynasty))) : 0

  return {
    nextYearStrength: normalize(nextSum),
    threeYearStrength: normalize(threeSum),
    fiveYearStrength: normalize(fiveSum),
    agingRiskScore,
    injuryRiskScore,
  }
}

