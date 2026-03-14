import type { PlayerAgingInputs } from './types'

export function estimateDeclineProbability(inputs: PlayerAgingInputs): number {
  const { position, age, injuryIndex, history } = inputs
  const pos = position.toUpperCase()
  const last = history[history.length - 1]
  const ppg = last && last.fantasyPoints != null
    ? (last.fantasyPoints / Math.max(1, last.gamesPlayed ?? 1))
    : 0

  let base = 10
  if (age != null) {
    if (pos === 'RB') {
      if (age >= 27) base = 40 + (age - 27) * 6
    } else if (pos === 'WR') {
      if (age >= 29) base = 30 + (age - 29) * 4
    } else if (pos === 'TE') {
      if (age >= 29) base = 28 + (age - 29) * 4
    } else if (pos === 'QB') {
      if (age >= 33) base = 25 + (age - 33) * 3
    }
  }

  if (injuryIndex != null && injuryIndex > 50) {
    base += 15
  } else if (injuryIndex != null && injuryIndex > 25) {
    base += 8
  }

  if (ppg >= 18) base += 5

  return Math.round(Math.min(95, Math.max(5, base)))
}

