import type { PlayerAgingInputs } from './types'

export function estimateBreakoutProbability(inputs: PlayerAgingInputs): number {
  const { position, age, draftPick, history } = inputs
  const pos = position.toUpperCase()
  const last = history[history.length - 1]
  const ppg = last && last.fantasyPoints != null
    ? (last.fantasyPoints / Math.max(1, last.gamesPlayed ?? 1))
    : 0

  let base = 10
  if (pos === 'RB' || pos === 'WR') {
    if (age != null && age <= 24) base = 30
  }
  if (pos === 'TE' && age != null && age <= 26) {
    base = 25
  }
  if (pos === 'QB' && age != null && age <= 26) {
    base = 20
  }

  if (draftPick != null && draftPick > 0 && draftPick <= 32) base += 10
  else if (draftPick != null && draftPick <= 96) base += 5

  if (ppg < 8) base += 10
  else if (ppg < 12) base += 5
  else base -= 5

  return Math.round(Math.min(80, Math.max(5, base)))
}

