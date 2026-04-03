/** 0-based slot index for snake draft given 1-based overall pick */
export function slotIndexForOverallPick(overallPick: number, numTeams: number): number {
  if (numTeams < 1) return 0
  const round = Math.floor((overallPick - 1) / numTeams) + 1
  const pickInRound = ((overallPick - 1) % numTeams) + 1
  const forward = round % 2 === 1
  return forward ? pickInRound - 1 : numTeams - pickInRound
}

export function roundForOverallPick(overallPick: number, numTeams: number): number {
  if (numTeams < 1) return 1
  return Math.floor((overallPick - 1) / numTeams) + 1
}

export function pickInRoundForOverall(overallPick: number, numTeams: number): number {
  if (numTeams < 1) return 1
  return ((overallPick - 1) % numTeams) + 1
}
