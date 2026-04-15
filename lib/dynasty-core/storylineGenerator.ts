import { prisma } from '@/lib/prisma'

/**
 * Dynasty AI Storyline Generator.
 * Creates narrative-driven content across seasons for dynasty leagues.
 * Requires AF Commissioner Subscription.
 *
 * Storyline types:
 * - Weekly matchup recaps
 * - Team arc narratives (contender, rebuilder, rising, falling)
 * - Player storylines (breakout, decline, comeback)
 * - Rivalry tracking
 * - Trade narratives
 * - Historical continuity references
 */

export type StorylineType =
  | 'weekly_recap'
  | 'team_arc'
  | 'player_storyline'
  | 'rivalry'
  | 'trade_story'
  | 'historical'
  | 'power_rankings'
  | 'draft_recap'
  | 'offseason_preview'

export type TeamArc =
  | 'rising_dynasty'
  | 'falling_empire'
  | 'perpetual_contender'
  | 'rebuild_in_progress'
  | 'dark_horse'
  | 'cellar_dweller'
  | 'championship_window'
  | 'post_championship'

export type StorylineEntry = {
  type: StorylineType
  title: string
  body: string
  participants: string[]
  season: number
  week: number | null
  tags: string[]
  metadata: Record<string, unknown>
}

/**
 * Detect team arc based on multi-season performance data.
 */
export async function detectTeamArc(
  leagueId: string,
  rosterId: string,
): Promise<{ arc: TeamArc; confidence: number; narrative: string }> {
  // Fetch historical seasons for this roster owner
  const roster = await prisma.redraftRoster.findUnique({
    where: { id: rosterId },
    select: { ownerId: true, wins: true, losses: true, pointsFor: true, playoffSeed: true },
  })
  if (!roster) return { arc: 'rebuild_in_progress', confidence: 0.3, narrative: 'New to the league.' }

  const historicalSeasons = await prisma.redraftRoster.findMany({
    where: {
      leagueId,
      ownerId: roster.ownerId,
    },
    orderBy: { season: { season: 'desc' } },
    take: 5,
    select: { wins: true, losses: true, pointsFor: true, playoffSeed: true },
  })

  if (historicalSeasons.length < 2) {
    return { arc: 'dark_horse', confidence: 0.4, narrative: 'Too early to tell. A wild card in the making.' }
  }

  const winPcts = historicalSeasons.map((s) => {
    const total = (s.wins ?? 0) + (s.losses ?? 0)
    return total > 0 ? (s.wins ?? 0) / total : 0.5
  })

  const recentWinPct = winPcts[0] ?? 0.5
  const avgWinPct = winPcts.reduce((a, b) => a + b, 0) / winPcts.length
  const trend = winPcts.length >= 2 ? (winPcts[0] ?? 0) - (winPcts[winPcts.length - 1] ?? 0) : 0
  const hadPlayoffSeed = historicalSeasons.some((s) => s.playoffSeed != null && s.playoffSeed > 0)
  const recentPlayoff = (historicalSeasons[0]?.playoffSeed ?? 0) > 0

  if (recentWinPct >= 0.7 && trend > 0.1) {
    return { arc: 'rising_dynasty', confidence: 0.8, narrative: 'On the rise. This team is building something special.' }
  }
  if (recentWinPct >= 0.65 && avgWinPct >= 0.6 && recentPlayoff) {
    return { arc: 'perpetual_contender', confidence: 0.75, narrative: 'Always in the mix. Year after year, this team competes.' }
  }
  if (hadPlayoffSeed && !recentPlayoff && trend < -0.15) {
    return { arc: 'falling_empire', confidence: 0.7, narrative: 'The empire crumbles. Former glory fades into memory.' }
  }
  if (recentWinPct <= 0.35 && trend > 0.05) {
    return { arc: 'rebuild_in_progress', confidence: 0.65, narrative: 'Tearing it down to build it back. Patience is the strategy.' }
  }
  if (recentWinPct <= 0.3) {
    return { arc: 'cellar_dweller', confidence: 0.6, narrative: 'Rock bottom. But every dynasty starts from the ashes.' }
  }
  if (recentWinPct >= 0.55 && recentWinPct <= 0.65) {
    return { arc: 'championship_window', confidence: 0.5, narrative: 'The window is open. Now or never for a title run.' }
  }

  return { arc: 'dark_horse', confidence: 0.4, narrative: 'Unpredictable. Could surprise anyone.' }
}

/**
 * Generate weekly matchup recap storyline.
 */
export function generateMatchupRecap(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  week: number,
): StorylineEntry {
  const margin = Math.abs(homeScore - awayScore)
  const winner = homeScore > awayScore ? homeTeam : awayTeam
  const loser = homeScore > awayScore ? awayTeam : homeTeam
  const winnerScore = Math.max(homeScore, awayScore)
  const loserScore = Math.min(homeScore, awayScore)

  let title: string
  let body: string
  const tags: string[] = []

  if (margin > 50) {
    title = `Absolute Demolition: ${winner} destroys ${loser}`
    body = `In what can only be described as a massacre, ${winner} put up ${winnerScore.toFixed(1)} points to ${loser}'s ${loserScore.toFixed(1)}. A ${margin.toFixed(1)}-point margin of victory that will echo through league history.`
    tags.push('blowout', 'domination')
  } else if (margin < 5) {
    title = `Nail-Biter: ${winner} survives against ${loser}`
    body = `${winner} edged out ${loser} by just ${margin.toFixed(1)} points in a matchup that came down to the final whistle. ${winnerScore.toFixed(1)} to ${loserScore.toFixed(1)} — this one will be talked about all week.`
    tags.push('close_game', 'thriller')
  } else if (loserScore > winnerScore * 0.95) {
    title = `${winner} holds off ${loser} in a shootout`
    body = `Both teams brought their A-game. ${winner} scored ${winnerScore.toFixed(1)} and ${loser} answered with ${loserScore.toFixed(1)}, but it wasn't quite enough.`
    tags.push('shootout', 'high_scoring')
  } else {
    title = `${winner} defeats ${loser}, ${winnerScore.toFixed(1)}-${loserScore.toFixed(1)}`
    body = `A solid victory for ${winner} over ${loser} with a comfortable ${margin.toFixed(1)}-point margin.`
    tags.push('standard')
  }

  return {
    type: 'weekly_recap',
    title,
    body,
    participants: [homeTeam, awayTeam],
    season: new Date().getFullYear(),
    week,
    tags,
    metadata: { homeScore, awayScore, margin, winner, loser },
  }
}

/**
 * Generate trade narrative.
 */
export function generateTradeNarrative(
  team1: string,
  team2: string,
  team1Gets: string[],
  team2Gets: string[],
  team1Arc: TeamArc,
  team2Arc: TeamArc,
): StorylineEntry {
  let title: string
  let body: string
  const tags: string[] = ['trade']

  const pickCount1 = team1Gets.filter((a) => a.toLowerCase().includes('pick')).length
  const pickCount2 = team2Gets.filter((a) => a.toLowerCase().includes('pick')).length
  const playerCount1 = team1Gets.length - pickCount1
  const playerCount2 = team2Gets.length - pickCount2

  if (team1Arc === 'rebuild_in_progress' && pickCount1 > playerCount1) {
    title = `${team1} continues the teardown`
    body = `${team1} ships out talent for future assets. ${team2} loads up for a run. A classic win-now vs rebuild exchange.`
    tags.push('rebuild', 'future_investment')
  } else if (team2Arc === 'championship_window' && playerCount2 > pickCount2) {
    title = `${team2} goes all-in`
    body = `${team2} acquires proven talent from ${team1}, sacrificing draft capital. The championship window is wide open.`
    tags.push('win_now', 'gamble')
  } else if (team1Gets.length + team2Gets.length >= 6) {
    title = `Blockbuster: ${team1} and ${team2} reshape the league`
    body = `A league-shaking deal involving ${team1Gets.length + team2Gets.length} assets. Both rosters look fundamentally different.`
    tags.push('blockbuster', 'league_shaking')
  } else {
    title = `${team1} and ${team2} swap assets`
    body = `A calculated exchange. ${team1} receives ${team1Gets.join(', ')}. ${team2} receives ${team2Gets.join(', ')}.`
    tags.push('standard_trade')
  }

  return {
    type: 'trade_story',
    title,
    body,
    participants: [team1, team2],
    season: new Date().getFullYear(),
    week: null,
    tags,
    metadata: { team1Gets, team2Gets, team1Arc, team2Arc },
  }
}

/**
 * Generate historical continuity reference.
 */
export function generateHistoricalReference(
  teamName: string,
  championshipCount: number,
  lastChampionshipYear: number | null,
  currentSeason: number,
): StorylineEntry | null {
  if (championshipCount === 0) return null

  const yearsSince = lastChampionshipYear ? currentSeason - lastChampionshipYear : 999
  let title: string
  let body: string

  if (yearsSince === 0) {
    title = 'Defending Champion'
    body = `${teamName} enters the season as defending champion. Can they repeat?`
  } else if (yearsSince === 1) {
    title = 'Dethroned'
    body = `${teamName} lost the crown last season after winning it all ${lastChampionshipYear}. The hunger for redemption is real.`
  } else if (championshipCount >= 3) {
    title = `Dynasty: ${championshipCount} Titles`
    body = `${teamName} has ${championshipCount} championships to their name. A true dynasty. Last title: ${lastChampionshipYear ?? 'unknown'}.`
  } else {
    title = `Former Champion (${lastChampionshipYear})`
    body = `${teamName} last hoisted the trophy in ${lastChampionshipYear}. ${yearsSince} years and counting since their last title.`
  }

  return {
    type: 'historical',
    title,
    body,
    participants: [teamName],
    season: currentSeason,
    week: null,
    tags: ['championship', 'history'],
    metadata: { championshipCount, lastChampionshipYear, yearsSince },
  }
}
