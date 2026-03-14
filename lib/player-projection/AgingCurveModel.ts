import type { PlayerAgingInputs } from './types'

type Horizon = 1 | 2 | 3 | 4 | 5

function baseAgeMultiplier(position: string, age: number | null, horizon: Horizon): number {
  if (!age || age <= 0) return 1
  const pos = position.toUpperCase()

  const curves: Record<string, { peakStart: number; peakEnd: number; cliff: number }> = {
    QB: { peakStart: 27, peakEnd: 34, cliff: 38 },
    RB: { peakStart: 23, peakEnd: 26, cliff: 29 },
    WR: { peakStart: 25, peakEnd: 30, cliff: 33 },
    TE: { peakStart: 26, peakEnd: 30, cliff: 33 },
  }
  const cfg = curves[pos] ?? { peakStart: 25, peakEnd: 29, cliff: 32 }

  const futureAge = age + (horizon - 1)

  if (futureAge < cfg.peakStart - 2) {
    return 0.8 + (futureAge / (cfg.peakStart - 2)) * 0.2
  }
  if (futureAge <= cfg.peakEnd) return 1.0
  if (futureAge >= cfg.cliff) return 0.4

  const t = (futureAge - cfg.peakEnd) / (cfg.cliff - cfg.peakEnd)
  return 1.0 - t * 0.6
}

function developmentMultiplier(position: string, history: PlayerAgingInputs['history'], horizon: Horizon): number {
  if (!history.length) return 1
  const pos = position.toUpperCase()
  const seasons = history.slice(-3)

  const pts = seasons
    .map((h) => (h.fantasyPoints ?? 0) / Math.max(1, h.gamesPlayed ?? 1))
  if (!pts.length) return 1

  const current = pts[pts.length - 1]
  const prev = pts.length >= 2 ? pts[pts.length - 2] : current
  const trend = current - prev

  let dev = 1
  if (pos === 'TE') {
    if (trend > 2) dev += 0.05 * horizon
  } else if (trend > 3) {
    dev += 0.03 * horizon
  } else if (trend < -3) {
    dev -= 0.04 * horizon
  }
  return Math.max(0.7, Math.min(1.3, dev))
}

export function projectPerGameUsingCurves(
  inputs: PlayerAgingInputs,
): Record<Horizon, number> {
  const { position, age, history } = inputs
  const recent = history.slice(-3)
  const ppgBase = recent.length
    ? recent.reduce((sum, h) => sum + (h.fantasyPoints ?? 0) / Math.max(1, h.gamesPlayed ?? 1), 0) / recent.length
    : 8

  const out = {} as Record<Horizon, number>
  ;[1, 2, 3, 4, 5].forEach((h) => {
    const horizon = h as Horizon
    const ageFactor = baseAgeMultiplier(position, age, horizon)
    const devFactor = developmentMultiplier(position, history, horizon)
    out[horizon] = Math.max(0, ppgBase * ageFactor * devFactor)
  })
  return out
}

