import type { RedraftRoster } from '@prisma/client'
import type { PlayoffStructure } from './types'

export function generatePlayoffBracket(
  rosters: RedraftRoster[],
  playoffTeams: number,
  _hasLowerBracket: boolean,
  _lowerBracketType: 'consolation' | 'toilet_bowl',
): PlayoffStructure {
  const sorted = [...rosters].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })
  const seeds = sorted.slice(0, playoffTeams).map((r) => r.id)
  const matchups: { home: string; away: string | null }[] = []
  for (let i = 0; i < Math.floor(seeds.length / 2); i++) {
    matchups.push({ home: seeds[i]!, away: seeds[seeds.length - 1 - i]! })
  }
  if (seeds.length % 2 === 1) {
    matchups.push({ home: seeds[Math.floor(seeds.length / 2)]!, away: null })
  }
  return {
    upperBracket: [{ round: 1, matchups }],
  }
}

export async function advancePlayoffWinners(_seasonId: string, _week: number): Promise<void> {
  // Placeholder: advance bracket JSON in RedraftPlayoffBracket.structure
}
