import type { RedraftRoster } from '@prisma/client'
import { tryGetSportConfig } from '@/lib/sportConfig'
import type { PlayoffStructure } from './types'

/** Bracket shape defaults from centralized sport config (commissioner can override). */
export function getPlayoffDefaults(sport: string): {
  teamCount: number
  startWeek: number
  rounds: number
  byeCount: number
} {
  const c = tryGetSportConfig(sport)
  if (!c) {
    return { teamCount: 4, startWeek: 15, rounds: 2, byeCount: 0 }
  }
  const teamCount = c.defaultPlayoffTeams
  const startWeek = c.defaultPlayoffStartWeek
  const rounds = Math.max(1, Math.ceil(Math.log2(Math.max(2, teamCount))))
  const nextPow2 = 2 ** rounds
  const byeCount = Math.max(0, nextPow2 - teamCount)
  return { teamCount, startWeek, rounds, byeCount }
}

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
