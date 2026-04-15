/**
 * Story Template Engine — Premium Fantasy Narratives
 *
 * Generates structured story content from deterministic matchup, standings,
 * and league data. Each story type has a template that produces:
 * headline, subheadline, summary, long recap, featured players, turning points,
 * biggest surprise, what it means, and social caption.
 *
 * This is the DETERMINISTIC layer — it prepares structured content that can
 * optionally be enhanced by the AI narrative pipeline in league-story-creator/.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryType =
  | 'weekly_recap'
  | 'matchup_recap'
  | 'upset_of_the_week'
  | 'manager_spotlight'
  | 'rivalry_recap'
  | 'trade_reaction'
  | 'playoff_race'
  | 'championship_preview'
  | 'season_narrative'

export interface FeaturedPlayer {
  name: string
  position: string
  team: string | null
  points: number
  highlight: string
}

export interface TurningPoint {
  description: string
  impact: 'decisive' | 'significant' | 'minor'
  timing: string
}

export interface StoryContent {
  storyType: StoryType
  headline: string
  subheadline: string
  shortSummary: string
  longRecap: string
  featuredPlayers: FeaturedPlayer[]
  turningPoints: TurningPoint[]
  biggestSurprise: string
  whatItMeansNext: string
  socialCaption: string
  /** Whether this story should be pinned / featured */
  isPinworthy: boolean
  /** Drama score 0-100 — higher = more entertaining */
  dramaScore: number
  /** Tags for filtering */
  tags: string[]
  /** Generated at */
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Input Types (flexible — works with whatever data is available)
// ---------------------------------------------------------------------------

export interface MatchupData {
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  teamARecord: string
  teamBRecord: string
  teamATopPlayers: FeaturedPlayer[]
  teamBTopPlayers: FeaturedPlayer[]
  week: number
  isPlayoff: boolean
  wasUpset: boolean
  marginOfVictory: number
}

export interface LeagueWeekData {
  leagueName: string
  week: number
  season: number
  matchups: MatchupData[]
  standings: Array<{
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    rank: number
    streak: string
  }>
  topScorer: { teamName: string; points: number } | null
  bottomScorer: { teamName: string; points: number } | null
  biggestUpset: MatchupData | null
  closestGame: MatchupData | null
}

export interface TradeData {
  senderName: string
  receiverName: string
  senderGives: string[]
  receiverGives: string[]
  fairnessGrade: string
  winner: string | null
  leagueReaction: 'approved' | 'controversial' | 'veto_risk' | 'neutral'
}

export interface PlayoffRaceData {
  leagueName: string
  week: number
  playoffSpots: number
  teams: Array<{
    teamName: string
    wins: number
    losses: number
    playoffOdds: number
    trend: 'rising' | 'stable' | 'falling'
    clinched: boolean
    eliminated: boolean
  }>
}

export interface StoryInput {
  storyType: StoryType
  leagueName: string
  sport: string
  /** Matchup data (for matchup_recap, upset_of_the_week) */
  matchup?: MatchupData
  /** Full week data (for weekly_recap) */
  weekData?: LeagueWeekData
  /** Trade data (for trade_reaction) */
  trade?: TradeData
  /** Playoff race data */
  playoffRace?: PlayoffRaceData
  /** Manager spotlight target */
  spotlightManager?: {
    name: string
    record: string
    trend: string
    highlight: string
    archetype?: string
  }
  /** Rivalry data */
  rivalry?: {
    managerA: string
    managerB: string
    historyNote: string
    thisWeekWinner: string
    thisWeekMargin: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function scoreDrama(matchup: MatchupData): number {
  let drama = 30
  if (matchup.wasUpset) drama += 25
  if (matchup.marginOfVictory <= 5) drama += 20
  if (matchup.marginOfVictory <= 2) drama += 15
  if (matchup.isPlayoff) drama += 10
  return Math.min(100, drama)
}

function winnerName(m: MatchupData): string {
  return m.teamAScore > m.teamBScore ? m.teamAName : m.teamBName
}

function loserName(m: MatchupData): string {
  return m.teamAScore > m.teamBScore ? m.teamBName : m.teamAName
}

function winnerScore(m: MatchupData): number {
  return Math.max(m.teamAScore, m.teamBScore)
}

function loserScore(m: MatchupData): number {
  return Math.min(m.teamAScore, m.teamBScore)
}

// ---------------------------------------------------------------------------
// Template: Weekly Recap
// ---------------------------------------------------------------------------

function buildWeeklyRecap(input: StoryInput): StoryContent {
  const week = input.weekData
  if (!week) return emptyStory('weekly_recap')

  const topScorer = week.topScorer
  const bottomScorer = week.bottomScorer
  const upset = week.biggestUpset
  const closest = week.closestGame
  const matchupCount = week.matchups.length

  // Featured players from all matchups
  const allPlayers = week.matchups.flatMap(m => [...m.teamATopPlayers, ...m.teamBTopPlayers])
  const featuredPlayers = [...allPlayers].sort((a, b) => b.points - a.points).slice(0, 4)

  // Headline
  const headline = topScorer
    ? `${topScorer.teamName} Erupts for ${topScorer.points.toFixed(1)} in Week ${week.week}`
    : `Week ${week.week}: ${matchupCount} Matchups, ${matchupCount} Stories`

  // Subheadline
  const subParts: string[] = []
  if (upset) subParts.push(`${winnerName(upset)} stuns ${loserName(upset)}`)
  if (closest) subParts.push(`${closest.teamAName} and ${closest.teamBName} go down to the wire`)
  const subheadline = subParts.join(' | ') || `Full Week ${week.week} breakdown`

  // Summary
  const summaryParts: string[] = []
  if (topScorer) summaryParts.push(`${topScorer.teamName} led all scorers with ${topScorer.points.toFixed(1)} points.`)
  if (bottomScorer) summaryParts.push(`${bottomScorer.teamName} had a week to forget with just ${bottomScorer.points.toFixed(1)}.`)
  if (upset) summaryParts.push(`The upset of the week belongs to ${winnerName(upset)} over ${loserName(upset)}.`)
  const shortSummary = summaryParts.join(' ')

  // Long recap
  const recapLines: string[] = []
  recapLines.push(`Week ${week.week} of ${input.leagueName} is in the books, and it was a wild one.`)
  for (const m of week.matchups.slice(0, 4)) {
    const winner = winnerName(m)
    const loser = loserName(m)
    if (m.wasUpset) {
      recapLines.push(`In the upset of the week, ${winner} knocked off ${loser} ${winnerScore(m).toFixed(1)}-${loserScore(m).toFixed(1)}.`)
    } else if (m.marginOfVictory <= 3) {
      recapLines.push(`${winner} squeaked past ${loser} by just ${m.marginOfVictory.toFixed(1)} points in a nail-biter.`)
    } else {
      recapLines.push(`${winner} handled ${loser} comfortably, ${winnerScore(m).toFixed(1)}-${loserScore(m).toFixed(1)}.`)
    }
  }
  const longRecap = recapLines.join(' ')

  // Turning points
  const turningPoints: TurningPoint[] = []
  if (upset) {
    turningPoints.push({
      description: `${winnerName(upset)} pulling the upset over ${loserName(upset)}`,
      impact: 'decisive',
      timing: `Week ${week.week}`,
    })
  }
  if (featuredPlayers.length > 0) {
    turningPoints.push({
      description: `${featuredPlayers[0].name} going off for ${featuredPlayers[0].points.toFixed(1)} points`,
      impact: 'significant',
      timing: `Week ${week.week}`,
    })
  }

  // Biggest surprise
  const biggestSurprise = upset
    ? `${winnerName(upset)} winning despite being the underdog — nobody saw this coming.`
    : bottomScorer
      ? `${bottomScorer.teamName} putting up the lowest score of the week. A wake-up call.`
      : 'No major surprises this week — the favorites held serve.'

  // What it means
  const leader = week.standings[0]
  const whatItMeansNext = leader
    ? `${leader.teamName} sits atop the standings at ${leader.wins}-${leader.losses}. The playoff picture is starting to take shape.`
    : 'Standings are tightening. Every win matters from here.'

  // Social caption
  const socialCaption = topScorer
    ? `🔥 ${topScorer.teamName} dropped ${topScorer.points.toFixed(1)} in Week ${week.week} of ${input.leagueName}! ${upset ? `Plus an upset: ${winnerName(upset)} over ${loserName(upset)}` : ''}`
    : `Week ${week.week} of ${input.leagueName} is in the books! 🏈`

  // Drama score
  const dramaScore = Math.min(100, Math.round(
    (upset ? 25 : 0) +
    (closest && closest.marginOfVictory <= 3 ? 20 : 0) +
    (matchupCount >= 6 ? 15 : 10) +
    30,
  ))

  return {
    storyType: 'weekly_recap',
    headline,
    subheadline,
    shortSummary,
    longRecap,
    featuredPlayers,
    turningPoints,
    biggestSurprise,
    whatItMeansNext,
    socialCaption,
    isPinworthy: dramaScore >= 70,
    dramaScore,
    tags: ['weekly', `week_${week.week}`, ...(upset ? ['upset'] : [])],
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Template: Matchup Recap
// ---------------------------------------------------------------------------

function buildMatchupRecap(input: StoryInput): StoryContent {
  const m = input.matchup
  if (!m) return emptyStory('matchup_recap')

  const winner = winnerName(m)
  const loser = loserName(m)
  const wScore = winnerScore(m)
  const lScore = loserScore(m)
  const margin = m.marginOfVictory
  const drama = scoreDrama(m)

  const topPlayer = [...m.teamATopPlayers, ...m.teamBTopPlayers].sort((a, b) => b.points - a.points)[0]

  const headline = margin <= 3
    ? `${winner} Edges ${loser} in a ${margin.toFixed(1)}-Point Thriller`
    : m.wasUpset
      ? `Upset Alert: ${winner} Takes Down ${loser}`
      : `${winner} Rolls Past ${loser}, ${wScore.toFixed(1)}-${lScore.toFixed(1)}`

  const subheadline = topPlayer
    ? `${topPlayer.name} leads the way with ${topPlayer.points.toFixed(1)} points`
    : `Final: ${wScore.toFixed(1)}-${lScore.toFixed(1)}`

  const shortSummary = `${winner} defeats ${loser} ${wScore.toFixed(1)}-${lScore.toFixed(1)}${m.wasUpset ? ' in a stunning upset' : ''}.${topPlayer ? ` ${topPlayer.name} was the star with ${topPlayer.points.toFixed(1)} points.` : ''}`

  const longRecap = `${winner} came away with the victory over ${loser} in Week ${m.week}, winning ${wScore.toFixed(1)}-${lScore.toFixed(1)}. ${margin <= 3 ? 'It went down to the wire — the kind of matchup that makes fantasy football great.' : margin >= 30 ? 'It was a complete demolition from start to finish.' : 'A solid performance that moves them to ' + (m.teamAScore > m.teamBScore ? m.teamARecord : m.teamBRecord) + ' on the season.'}${topPlayer ? ` ${topPlayer.name} was the difference-maker, posting ${topPlayer.points.toFixed(1)} points from the ${topPlayer.position} spot.` : ''}`

  const socialCaption = `${m.wasUpset ? '😱' : '✅'} ${winner} ${wScore.toFixed(1)} - ${lScore.toFixed(1)} ${loser}${topPlayer ? ` | MVP: ${topPlayer.name} (${topPlayer.points.toFixed(1)})` : ''} #FantasyFootball`

  return {
    storyType: 'matchup_recap',
    headline,
    subheadline,
    shortSummary,
    longRecap,
    featuredPlayers: [...m.teamATopPlayers, ...m.teamBTopPlayers].sort((a, b) => b.points - a.points).slice(0, 3),
    turningPoints: topPlayer ? [{ description: `${topPlayer.name}'s ${topPlayer.points.toFixed(1)}-point performance`, impact: 'decisive' as const, timing: `Week ${m.week}` }] : [],
    biggestSurprise: m.wasUpset ? `${winner} winning as the underdog. The record says one thing, but this week said another.` : `The ${margin.toFixed(1)}-point margin ${margin <= 3 ? '— could have gone either way.' : '— one team clearly had the edge.'}`,
    whatItMeansNext: `${winner} builds momentum at ${m.teamAScore > m.teamBScore ? m.teamARecord : m.teamBRecord}. ${loser} needs to regroup and find answers.`,
    socialCaption,
    isPinworthy: drama >= 65,
    dramaScore: drama,
    tags: ['matchup', `week_${m.week}`, ...(m.wasUpset ? ['upset'] : []), ...(margin <= 3 ? ['thriller'] : [])],
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Template: Trade Reaction
// ---------------------------------------------------------------------------

function buildTradeReaction(input: StoryInput): StoryContent {
  const t = input.trade
  if (!t) return emptyStory('trade_reaction')

  const headline = t.leagueReaction === 'controversial'
    ? `Blockbuster Alert: ${t.senderName} and ${t.receiverName} Shake Up the League`
    : t.leagueReaction === 'veto_risk'
      ? `Controversial Trade: ${t.senderName}-${t.receiverName} Deal Faces Scrutiny`
      : `Trade Complete: ${t.senderName} and ${t.receiverName} Exchange Assets`

  const senderAssets = t.senderGives.join(', ')
  const receiverAssets = t.receiverGives.join(', ')

  const shortSummary = `${t.senderName} sends ${senderAssets} to ${t.receiverName} for ${receiverAssets}. Grade: ${t.fairnessGrade}.${t.winner ? ` ${t.winner} gets the edge.` : ''}`

  return {
    storyType: 'trade_reaction',
    headline,
    subheadline: `${t.senderName} gives: ${senderAssets} | ${t.receiverName} gives: ${receiverAssets}`,
    shortSummary,
    longRecap: `${t.senderName} and ${t.receiverName} have completed a trade that ${t.leagueReaction === 'controversial' ? 'has the whole league talking' : t.leagueReaction === 'veto_risk' ? 'has some managers questioning the fairness' : 'makes sense for both sides'}. The deal sends ${senderAssets} to ${t.receiverName} in exchange for ${receiverAssets}. ${t.winner ? `Our analysis gives the edge to ${t.winner}.` : 'This looks like a fair swap.'} Fairness grade: ${t.fairnessGrade}.`,
    featuredPlayers: [],
    turningPoints: [{ description: `Trade execution between ${t.senderName} and ${t.receiverName}`, impact: 'significant', timing: 'Trade deadline' }],
    biggestSurprise: t.leagueReaction === 'controversial' ? 'The boldness of the move — one side is clearly swinging for the fences.' : 'No major surprises — both sides addressed clear needs.',
    whatItMeansNext: t.winner ? `${t.winner} strengthens their position. The other side is betting on upside.` : 'Both teams addressed needs. Time will tell who got the better end.',
    socialCaption: `🔄 Trade Alert: ${t.senderName} ↔️ ${t.receiverName} | Grade: ${t.fairnessGrade}${t.winner ? ` | Edge: ${t.winner}` : ''}`,
    isPinworthy: t.leagueReaction === 'controversial' || t.leagueReaction === 'veto_risk',
    dramaScore: t.leagueReaction === 'controversial' ? 80 : t.leagueReaction === 'veto_risk' ? 75 : 40,
    tags: ['trade', ...(t.leagueReaction === 'controversial' ? ['blockbuster'] : [])],
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Template: Playoff Race
// ---------------------------------------------------------------------------

function buildPlayoffRace(input: StoryInput): StoryContent {
  const race = input.playoffRace
  if (!race) return emptyStory('playoff_race')

  const clinched = race.teams.filter(t => t.clinched)
  const eliminated = race.teams.filter(t => t.eliminated)
  const bubble = race.teams.filter(t => !t.clinched && !t.eliminated && t.playoffOdds >= 20 && t.playoffOdds <= 80)
  const rising = race.teams.filter(t => t.trend === 'rising' && !t.clinched)

  const headline = clinched.length > 0
    ? `${clinched[0].teamName} Clinches Playoff Spot — ${bubble.length} Teams Still Fighting`
    : `${bubble.length} Teams in the Playoff Hunt — Week ${race.week} Breakdown`

  const shortSummary = `${clinched.length} teams clinched, ${eliminated.length} eliminated, ${bubble.length} on the bubble. The race is ${bubble.length >= 4 ? 'wide open' : 'tightening'}.`

  const recapLines: string[] = []
  recapLines.push(`The playoff picture in ${race.leagueName} is getting clearer after Week ${race.week}.`)
  if (clinched.length > 0) recapLines.push(`${clinched.map(t => t.teamName).join(', ')} ${clinched.length === 1 ? 'has' : 'have'} punched ${clinched.length === 1 ? 'their' : 'their'} ticket.`)
  if (bubble.length > 0) recapLines.push(`On the bubble: ${bubble.map(t => `${t.teamName} (${t.playoffOdds}%)`).join(', ')}.`)
  if (rising.length > 0) recapLines.push(`Watch out for ${rising.map(t => t.teamName).join(' and ')} — trending in the right direction.`)

  return {
    storyType: 'playoff_race',
    headline,
    subheadline: `${race.playoffSpots} spots, ${race.teams.length} teams — who's in, who's out?`,
    shortSummary,
    longRecap: recapLines.join(' '),
    featuredPlayers: [],
    turningPoints: clinched.length > 0 ? [{ description: `${clinched[0].teamName} clinching a playoff spot`, impact: 'decisive', timing: `Week ${race.week}` }] : [],
    biggestSurprise: rising.length > 0 ? `${rising[0].teamName}'s late surge — they're making a real push.` : 'The favorites are holding serve.',
    whatItMeansNext: `Every win counts. ${bubble.length > 0 ? `${bubble[0].teamName} has the most to prove next week.` : 'The top seeds are separating from the pack.'}`,
    socialCaption: `🏆 Playoff Race Update — ${race.leagueName} Week ${race.week}: ${clinched.length} clinched, ${bubble.length} on the bubble, ${eliminated.length} eliminated`,
    isPinworthy: true,
    dramaScore: Math.min(100, 50 + bubble.length * 8),
    tags: ['playoffs', `week_${race.week}`, 'standings'],
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Generic/Empty Story
// ---------------------------------------------------------------------------

function emptyStory(type: StoryType): StoryContent {
  return {
    storyType: type,
    headline: 'Story Unavailable',
    subheadline: 'Insufficient data to generate this story.',
    shortSummary: 'Not enough data was provided to generate this story type.',
    longRecap: '',
    featuredPlayers: [],
    turningPoints: [],
    biggestSurprise: '',
    whatItMeansNext: '',
    socialCaption: '',
    isPinworthy: false,
    dramaScore: 0,
    tags: [],
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export function generateStory(input: StoryInput): StoryContent {
  switch (input.storyType) {
    case 'weekly_recap':
      return buildWeeklyRecap(input)
    case 'matchup_recap':
    case 'upset_of_the_week':
      return buildMatchupRecap(input)
    case 'trade_reaction':
      return buildTradeReaction(input)
    case 'playoff_race':
    case 'championship_preview':
      return buildPlayoffRace(input)
    case 'manager_spotlight':
    case 'rivalry_recap':
    case 'season_narrative':
      // These require AI narrative enhancement — return structured data for the
      // LeagueStoryCreatorService to process through the One-Brain pipeline
      return emptyStory(input.storyType)
    default:
      return emptyStory(input.storyType)
  }
}

/**
 * Generate multiple stories for a league week.
 * Automatically selects the best story types based on available data.
 */
export function generateWeeklyStoryBundle(input: {
  leagueName: string
  sport: string
  weekData: LeagueWeekData
  trades?: TradeData[]
  playoffRace?: PlayoffRaceData
}): StoryContent[] {
  const stories: StoryContent[] = []

  // Always generate weekly recap
  stories.push(generateStory({
    storyType: 'weekly_recap',
    leagueName: input.leagueName,
    sport: input.sport,
    weekData: input.weekData,
  }))

  // Generate upset story if there was one
  if (input.weekData.biggestUpset) {
    stories.push(generateStory({
      storyType: 'upset_of_the_week',
      leagueName: input.leagueName,
      sport: input.sport,
      matchup: input.weekData.biggestUpset,
    }))
  }

  // Generate closest game story
  if (input.weekData.closestGame && input.weekData.closestGame.marginOfVictory <= 5) {
    stories.push(generateStory({
      storyType: 'matchup_recap',
      leagueName: input.leagueName,
      sport: input.sport,
      matchup: input.weekData.closestGame,
    }))
  }

  // Generate trade reaction stories
  for (const trade of (input.trades ?? []).slice(0, 2)) {
    stories.push(generateStory({
      storyType: 'trade_reaction',
      leagueName: input.leagueName,
      sport: input.sport,
      trade,
    }))
  }

  // Generate playoff race if data available
  if (input.playoffRace) {
    stories.push(generateStory({
      storyType: 'playoff_race',
      leagueName: input.leagueName,
      sport: input.sport,
      playoffRace: input.playoffRace,
    }))
  }

  // Sort by drama score (most dramatic first)
  stories.sort((a, b) => b.dramaScore - a.dramaScore)

  return stories
}
