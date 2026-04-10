/**
 * Odd-Number Playoff Bracket Generator
 *
 * Supports 3, 5, 7, 9, and 11-team playoff brackets.
 * Gated behind AF Commissioner subscription.
 *
 * Logic:
 * - Odd-team brackets give the #1 seed a first-round bye
 * - Remaining teams are paired (2v7, 3v6, 4v5 for 7 teams)
 * - Winners advance to face the bye team
 * - Standard single-elimination from there
 */

export type BracketMatchup = {
  round: number
  matchupIndex: number
  homeSeed: number | null // null = TBD (winner of prior)
  awaySeed: number | null
  homeLabel: string
  awayLabel: string
  isBye: boolean
}

export type OddPlayoffBracket = {
  teamCount: number
  rounds: number
  byeSeeds: number[]
  matchups: BracketMatchup[]
}

/**
 * Generate a bracket for any team count (including odd numbers).
 */
export function generateOddPlayoffBracket(teamCount: number): OddPlayoffBracket {
  if (teamCount < 2) throw new Error('Need at least 2 teams for playoffs')

  // Power of 2 — standard bracket, no special handling needed
  if (isPowerOf2(teamCount)) {
    return generateStandardBracket(teamCount)
  }

  // Odd or non-power-of-2 — use bye system
  const nextPow = nextPowerOf2(teamCount)
  const byeCount = nextPow - teamCount
  const rounds = Math.ceil(Math.log2(nextPow))
  const byeSeeds = Array.from({ length: byeCount }, (_, i) => i + 1) // top seeds get byes

  const matchups: BracketMatchup[] = []

  // Round 1: pair non-bye teams
  const round1Teams: number[] = []
  for (let seed = 1; seed <= teamCount; seed++) {
    if (!byeSeeds.includes(seed)) round1Teams.push(seed)
  }

  // Pair high vs low seeds
  const round1Matchups = Math.floor(round1Teams.length / 2)
  for (let i = 0; i < round1Matchups; i++) {
    const home = round1Teams[i]
    const away = round1Teams[round1Teams.length - 1 - i]
    matchups.push({
      round: 1,
      matchupIndex: i,
      homeSeed: home,
      awaySeed: away,
      homeLabel: `#${home} Seed`,
      awayLabel: `#${away} Seed`,
      isBye: false,
    })
  }

  // Add bye matchups for round 1
  for (const seed of byeSeeds) {
    matchups.push({
      round: 1,
      matchupIndex: matchups.length,
      homeSeed: seed,
      awaySeed: null,
      homeLabel: `#${seed} Seed`,
      awayLabel: 'BYE',
      isBye: true,
    })
  }

  // Subsequent rounds: TBD matchups
  let prevRoundMatchupCount = Math.ceil((teamCount) / 2)
  for (let round = 2; round <= rounds; round++) {
    const thisRoundCount = Math.ceil(prevRoundMatchupCount / 2)
    for (let i = 0; i < thisRoundCount; i++) {
      matchups.push({
        round,
        matchupIndex: i,
        homeSeed: null,
        awaySeed: null,
        homeLabel: `Winner R${round - 1}M${i * 2 + 1}`,
        awayLabel: `Winner R${round - 1}M${i * 2 + 2}`,
        isBye: false,
      })
    }
    prevRoundMatchupCount = thisRoundCount
  }

  return { teamCount, rounds, byeSeeds, matchups }
}

/**
 * Get supported odd playoff sizes for AF Commissioner.
 */
export function getOddPlayoffSizes(): number[] {
  return [3, 5, 7, 9, 11]
}

/**
 * Get all supported playoff sizes (standard + odd for commissioner).
 */
export function getAllPlayoffSizes(hasCommissionerSub: boolean): number[] {
  const standard = [2, 4, 6, 8, 10, 12, 14, 16]
  if (!hasCommissionerSub) return standard
  return [...standard, 3, 5, 7, 9, 11].sort((a, b) => a - b)
}

function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function generateStandardBracket(teamCount: number): OddPlayoffBracket {
  const rounds = Math.log2(teamCount)
  const matchups: BracketMatchup[] = []

  // Round 1
  for (let i = 0; i < teamCount / 2; i++) {
    matchups.push({
      round: 1,
      matchupIndex: i,
      homeSeed: i + 1,
      awaySeed: teamCount - i,
      homeLabel: `#${i + 1} Seed`,
      awayLabel: `#${teamCount - i} Seed`,
      isBye: false,
    })
  }

  // Subsequent rounds
  let prevCount = teamCount / 2
  for (let round = 2; round <= rounds; round++) {
    const thisCount = prevCount / 2
    for (let i = 0; i < thisCount; i++) {
      matchups.push({
        round,
        matchupIndex: i,
        homeSeed: null,
        awaySeed: null,
        homeLabel: `Winner R${round - 1}M${i * 2 + 1}`,
        awayLabel: `Winner R${round - 1}M${i * 2 + 2}`,
        isBye: false,
      })
    }
    prevCount = thisCount
  }

  return { teamCount, rounds, byeSeeds: [], matchups }
}
