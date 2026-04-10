/**
 * Chimmy Enhanced Context Provider
 *
 * Wires all disconnected platform systems into Chimmy's context:
 * 1. Playoff odds + championship probability
 * 2. Dynasty 3-5 year outlook per manager
 * 3. League health / engagement metrics for commissioners
 * 4. Injury news feed aggregation
 * 5. Natural language rules query
 * 6. Live game commentary hooks
 * 7. Weekly briefing generation
 * 8. Social card trigger bridge
 * 9. Zombie AI recap bridge
 */

import { prisma } from '@/lib/prisma'

// ============================================================================
// 1. PLAYOFF ODDS CONTEXT
// ============================================================================

export type PlayoffOddsContext = {
  teamId: string
  teamName: string
  playoffProbability: number
  championshipProbability: number
  currentRecord: { wins: number; losses: number }
  currentRank: number
  clinchStatus: 'clinched' | 'in_contention' | 'eliminated' | 'unknown'
}

export async function getPlayoffOddsForChimmy(
  leagueId: string,
  teamId?: string,
): Promise<PlayoffOddsContext[]> {
  try {
    const { getSeasonForecast } = await import('@/lib/season-forecast/SeasonForecastEngine')
    const season = new Date().getFullYear()
    const currentWeek = await getCurrentWeek(leagueId)
    const forecast = await getSeasonForecast(leagueId, season, currentWeek)
    if (!forecast) return []

    const results = forecast.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName ?? t.teamId,
      playoffProbability: t.playoffProbability ?? 0,
      championshipProbability: t.championshipProbability ?? 0,
      currentRecord: { wins: t.wins ?? 0, losses: t.losses ?? 0 },
      currentRank: t.currentRank ?? 0,
      clinchStatus: (t.playoffProbability ?? 0) > 99
        ? 'clinched' as const
        : (t.playoffProbability ?? 0) < 1
          ? 'eliminated' as const
          : 'in_contention' as const,
    }))

    if (teamId) return results.filter((r) => r.teamId === teamId)
    return results
  } catch {
    return []
  }
}

// ============================================================================
// 2. DYNASTY 3-5 YEAR OUTLOOK
// ============================================================================

export type DynastyOutlookContext = {
  teamId: string
  teamName: string
  championshipWindowScore: number
  rebuildProbability: number
  rosterStrength3Year: number
  rosterStrength5Year: number
  agingRiskScore: number
  futureAssetScore: number
  outlook: 'contender' | 'win_now' | 'competitive' | 'retooling' | 'rebuilding'
  keyFactors: string[]
  draftCapital: { totalPicks: number; firstRoundPicks: number; yearsOut: number }
  rosterAge: { avgAge: number; coreAge: number; youngAssets: number; veteranAssets: number }
}

export async function getDynastyOutlookForChimmy(
  leagueId: string,
  teamId?: string,
): Promise<DynastyOutlookContext[]> {
  try {
    const { getDynastyProjectionsForLeague } = await import('@/lib/dynasty-engine/DynastyQueryService')
    const projections = await getDynastyProjectionsForLeague(leagueId)

    const results: DynastyOutlookContext[] = []
    for (const p of projections) {
      const outlook = classifyOutlook(p.championshipWindowScore, p.rebuildProbability, p.rosterStrength3Year)
      const factors = generateKeyFactors(p)

      // Get draft capital
      const picks = await prisma.draftPick.findMany({
        where: { session: { leagueId } },
        select: { round: true },
      }).catch(() => [])

      const futureDevyPicks = await prisma.devyDraftPick?.findMany?.({
        where: { leagueId, currentOwnerId: p.teamId, isUsed: false },
      }).catch(() => [])

      results.push({
        teamId: p.teamId,
        teamName: p.teamId,
        championshipWindowScore: p.championshipWindowScore,
        rebuildProbability: p.rebuildProbability,
        rosterStrength3Year: p.rosterStrength3Year,
        rosterStrength5Year: p.rosterStrength5Year,
        agingRiskScore: p.agingRiskScore,
        futureAssetScore: p.futureAssetScore,
        outlook,
        keyFactors: factors,
        draftCapital: {
          totalPicks: (futureDevyPicks?.length ?? 0) + picks.length,
          firstRoundPicks: (futureDevyPicks?.filter((p) => p.round === 1).length ?? 0),
          yearsOut: 3,
        },
        rosterAge: { avgAge: 0, coreAge: 0, youngAssets: 0, veteranAssets: 0 },
      })
    }

    if (teamId) return results.filter((r) => r.teamId === teamId)
    return results.sort((a, b) => b.rosterStrength3Year - a.rosterStrength3Year)
  } catch {
    return []
  }
}

function classifyOutlook(
  windowScore: number,
  rebuildProb: number,
  strength3yr: number,
): DynastyOutlookContext['outlook'] {
  if (windowScore > 80 && rebuildProb < 15) return 'contender'
  if (windowScore > 65) return 'win_now'
  if (strength3yr > 60 && rebuildProb < 40) return 'competitive'
  if (rebuildProb > 60) return 'rebuilding'
  return 'retooling'
}

function generateKeyFactors(p: {
  championshipWindowScore: number
  rebuildProbability: number
  rosterStrength3Year: number
  rosterStrength5Year: number
  agingRiskScore: number
  futureAssetScore: number
}): string[] {
  const factors: string[] = []
  if (p.championshipWindowScore > 75) factors.push('Championship window is wide open')
  if (p.agingRiskScore > 70) factors.push('High aging risk — core players declining')
  if (p.futureAssetScore > 70) factors.push('Strong future asset base (picks + prospects)')
  if (p.rosterStrength5Year < 40) factors.push('Long-term roster depth is thin')
  if (p.rebuildProbability > 50) factors.push('Rebuild recommended — sell veterans for picks')
  if (p.rosterStrength3Year > 70) factors.push('Roster projects well over 3 years')
  if (factors.length === 0) factors.push('Balanced roster — monitor for opportunities')
  return factors
}

// ============================================================================
// 3. LEAGUE HEALTH / ENGAGEMENT
// ============================================================================

export type LeagueHealthContext = {
  leagueId: string
  totalManagers: number
  activeManagers: number
  inactiveManagers: string[]
  avgLoginDays: number
  lineupSetRate: number
  tradeActivity: number
  waiverActivity: number
  chatActivity: number
  healthScore: number
  healthLabel: 'thriving' | 'healthy' | 'at_risk' | 'declining'
  recommendations: string[]
}

export async function getLeagueHealthForChimmy(leagueId: string): Promise<LeagueHealthContext> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league) {
    return {
      leagueId,
      totalManagers: 0,
      activeManagers: 0,
      inactiveManagers: [],
      avgLoginDays: 0,
      lineupSetRate: 0,
      tradeActivity: 0,
      waiverActivity: 0,
      chatActivity: 0,
      healthScore: 0,
      healthLabel: 'declining',
      recommendations: ['League not found'],
    }
  }

  const totalManagers = league.teams.length
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Check chat activity
  const chatCount = await prisma.leagueChatMessage.count({
    where: { leagueId, createdAt: { gte: thirtyDaysAgo } },
  }).catch(() => 0)

  // Check trade activity
  const tradeCount = await prisma.redraftLeagueTrade?.count?.({
    where: { leagueId, createdAt: { gte: thirtyDaysAgo } },
  }).catch(() => 0) ?? 0

  // Check waiver activity
  const waiverCount = await prisma.redraftWaiverClaim?.count?.({
    where: { leagueId, createdAt: { gte: thirtyDaysAgo } },
  }).catch(() => 0) ?? 0

  const chatPerManager = totalManagers > 0 ? chatCount / totalManagers : 0
  const healthScore = Math.min(100, Math.round(
    (chatPerManager > 5 ? 25 : chatPerManager * 5) +
    (tradeCount > 3 ? 25 : tradeCount * 8) +
    (waiverCount > 5 ? 25 : waiverCount * 5) +
    25, // base
  ))

  const healthLabel: LeagueHealthContext['healthLabel'] =
    healthScore > 75 ? 'thriving' : healthScore > 50 ? 'healthy' : healthScore > 25 ? 'at_risk' : 'declining'

  const recommendations: string[] = []
  if (chatPerManager < 2) recommendations.push('Encourage more league chat activity')
  if (tradeCount === 0) recommendations.push('No trades in 30 days — consider trade incentives')
  if (waiverCount < 3) recommendations.push('Low waiver activity — managers may be disengaged')
  if (recommendations.length === 0) recommendations.push('League engagement is strong')

  return {
    leagueId,
    totalManagers,
    activeManagers: totalManagers, // simplified
    inactiveManagers: [],
    avgLoginDays: 0,
    lineupSetRate: 0,
    tradeActivity: tradeCount,
    waiverActivity: waiverCount,
    chatActivity: chatCount,
    healthScore,
    healthLabel,
    recommendations,
  }
}

// ============================================================================
// 4. WEEKLY BRIEFING GENERATOR
// ============================================================================

export type WeeklyBriefing = {
  teamId: string
  teamName: string
  week: number
  sections: {
    matchupPreview: string
    rosterAlerts: string[]
    waiverTargets: string[]
    playoffUpdate: string
    leagueNews: string[]
  }
}

export async function generateWeeklyBriefingForChimmy(
  leagueId: string,
  teamId: string,
  week: number,
): Promise<WeeklyBriefing> {
  const sections: WeeklyBriefing['sections'] = {
    matchupPreview: `Week ${week} matchup preview loading...`,
    rosterAlerts: [],
    waiverTargets: [],
    playoffUpdate: '',
    leagueNews: [],
  }

  // Get matchup
  const matchup = await prisma.redraftMatchup.findFirst({
    where: { leagueId, week, OR: [{ homeRosterId: teamId }, { awayRosterId: teamId }] },
    select: { homeRosterId: true, awayRosterId: true, homeProjected: true, awayProjected: true },
  }).catch(() => null)

  if (matchup) {
    const isHome = matchup.homeRosterId === teamId
    const myProj = isHome ? matchup.homeProjected : matchup.awayProjected
    const oppProj = isHome ? matchup.awayProjected : matchup.homeProjected
    sections.matchupPreview = `Projected: ${(myProj ?? 0).toFixed(1)} vs ${(oppProj ?? 0).toFixed(1)}`
  }

  // Playoff odds
  const odds = await getPlayoffOddsForChimmy(leagueId, teamId)
  if (odds.length > 0) {
    sections.playoffUpdate = `Playoff odds: ${(odds[0].playoffProbability * 100).toFixed(0)}% | Championship: ${(odds[0].championshipProbability * 100).toFixed(0)}%`
  }

  return {
    teamId,
    teamName: teamId,
    week,
    sections,
  }
}

// ============================================================================
// 5. NATURAL LANGUAGE RULES QUERY
// ============================================================================

export async function queryLeagueRulesForChimmy(
  leagueId: string,
  question: string,
): Promise<{ answer: string; source: string }> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, leagueVariant: true, sport: true, name: true },
  })
  if (!league) return { answer: 'League not found.', source: 'system' }

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const lower = question.toLowerCase()

  // Check for pinned FAQ
  const faq = await prisma.leagueChatMessage.findFirst({
    where: {
      leagueId,
      type: 'host_announcement',
      metadata: { path: ['contentType'], equals: 'league_faq' },
    },
    orderBy: { createdAt: 'desc' },
    select: { message: true },
  }).catch(() => null)

  if (faq?.message) {
    // Search FAQ content for relevant sections
    const faqLines = faq.message.split('\n')
    const matches = faqLines.filter((line) => {
      const l = line.toLowerCase()
      return lower.split(' ').some((word) => word.length > 3 && l.includes(word))
    })
    if (matches.length > 0) {
      return {
        answer: matches.slice(0, 5).join('\n'),
        source: 'league_faq',
      }
    }
  }

  // Fallback to settings-based answer
  const answers: string[] = []
  if (lower.includes('waiver') || lower.includes('faab')) {
    answers.push(`Waiver type: ${settings.waiver_type ?? 'FAAB'}`)
    if (settings.faab_budget) answers.push(`FAAB budget: $${settings.faab_budget}`)
  }
  if (lower.includes('trade')) {
    answers.push(`Trade review: ${settings.trade_review_mode ?? 'commissioner'}`)
  }
  if (lower.includes('playoff')) {
    answers.push(`Playoff teams: ${settings.playoff_team_count ?? 6}`)
    answers.push(`Playoff start: Week ${settings.playoff_start_week ?? 15}`)
  }
  if (lower.includes('scoring') || lower.includes('ppr')) {
    answers.push(`Scoring: ${settings.scoring_format ?? settings.scoring ?? 'PPR'}`)
  }
  if (lower.includes('roster') || lower.includes('lineup')) {
    answers.push(`Roster mode: ${settings.roster_mode ?? 'redraft'}`)
  }

  return {
    answer: answers.length > 0 ? answers.join('\n') : `Ask your commissioner about: "${question}"`,
    source: answers.length > 0 ? 'league_settings' : 'fallback',
  }
}

// ============================================================================
// 6. LIVE GAME COMMENTARY HOOKS
// ============================================================================

export type LiveGameEvent = {
  type: 'scoring_play' | 'lead_change' | 'injury' | 'milestone'
  playerName: string
  team: string
  description: string
  fantasyPoints: number
  matchupImpact: 'winning' | 'losing' | 'tied' | 'unknown'
  timestamp: string
}

export async function getLiveGameEventsForChimmy(
  leagueId: string,
  teamId: string,
  _week: number,
): Promise<LiveGameEvent[]> {
  // Hook point: when live score feeds are connected, this will
  // aggregate scoring plays relevant to the user's matchup.
  // Currently returns empty — will be populated by SSE/WebSocket integration.
  return []
}

// ============================================================================
// 7. INJURY FEED AGGREGATION
// ============================================================================

export type InjuryAlert = {
  playerName: string
  team: string
  position: string
  status: string
  impact: 'high' | 'medium' | 'low'
  isOnMyRoster: boolean
  replacement: string | null
}

export async function getInjuryAlertsForChimmy(
  leagueId: string,
  teamId: string,
): Promise<InjuryAlert[]> {
  // Hook point: when injury feed is integrated, this will surface
  // relevant injuries for the user's roster and opponents.
  // Currently returns empty — will be populated by news integration.
  return []
}

// ============================================================================
// 8. SOCIAL CARD BRIDGE
// ============================================================================

export async function triggerSocialCardGeneration(
  leagueId: string,
  cardType: 'draft_recap' | 'weekly_recap' | 'trade_recap' | 'power_rankings' | 'season_summary',
  _context: Record<string, unknown>,
): Promise<{ triggered: boolean; cardId?: string }> {
  // Hook point: bridge to AISocialClipOrchestrator
  // When connected, Chimmy can say "generate a shareable recap card"
  // and trigger the social clip engine.
  return { triggered: false }
}

// ============================================================================
// 9. ZOMBIE AI RECAP BRIDGE
// ============================================================================

export async function getZombieWeeklyRecapForChimmy(
  leagueId: string,
  week: number,
): Promise<string | null> {
  try {
    const { buildWeeklyUpdate, composeWeeklyUpdateBody } = await import('@/lib/zombie/weeklyUpdateEngine')
    const draft = await buildWeeklyUpdate(leagueId, week)
    return composeWeeklyUpdateBody(draft)
  } catch {
    return null
  }
}

// ============================================================================
// UNIFIED ENHANCED CONTEXT BUILDER
// ============================================================================

export type ChimmyEnhancedContext = {
  playoffOdds: PlayoffOddsContext[]
  dynastyOutlook: DynastyOutlookContext[]
  leagueHealth: LeagueHealthContext | null
  weeklyBriefing: WeeklyBriefing | null
  rulesAnswer: { answer: string; source: string } | null
  liveEvents: LiveGameEvent[]
  injuryAlerts: InjuryAlert[]
  zombieRecap: string | null
}

export async function buildEnhancedChimmyContext(
  leagueId: string,
  teamId: string | null,
  options?: {
    includePlayoffOdds?: boolean
    includeDynastyOutlook?: boolean
    includeLeagueHealth?: boolean
    includeWeeklyBriefing?: boolean
    rulesQuestion?: string
    includeLiveEvents?: boolean
    includeInjuries?: boolean
    includeZombieRecap?: boolean
    week?: number
  },
): Promise<ChimmyEnhancedContext> {
  const week = options?.week ?? await getCurrentWeek(leagueId)

  const [playoffOdds, dynastyOutlook, leagueHealth, weeklyBriefing, rulesAnswer, liveEvents, injuryAlerts, zombieRecap] =
    await Promise.all([
      options?.includePlayoffOdds ? getPlayoffOddsForChimmy(leagueId, teamId ?? undefined) : Promise.resolve([]),
      options?.includeDynastyOutlook ? getDynastyOutlookForChimmy(leagueId, teamId ?? undefined) : Promise.resolve([]),
      options?.includeLeagueHealth ? getLeagueHealthForChimmy(leagueId) : Promise.resolve(null),
      options?.includeWeeklyBriefing && teamId ? generateWeeklyBriefingForChimmy(leagueId, teamId, week) : Promise.resolve(null),
      options?.rulesQuestion ? queryLeagueRulesForChimmy(leagueId, options.rulesQuestion) : Promise.resolve(null),
      options?.includeLiveEvents && teamId ? getLiveGameEventsForChimmy(leagueId, teamId, week) : Promise.resolve([]),
      options?.includeInjuries && teamId ? getInjuryAlertsForChimmy(leagueId, teamId) : Promise.resolve([]),
      options?.includeZombieRecap ? getZombieWeeklyRecapForChimmy(leagueId, week) : Promise.resolve(null),
    ])

  return {
    playoffOdds,
    dynastyOutlook,
    leagueHealth,
    weeklyBriefing,
    rulesAnswer,
    liveEvents,
    injuryAlerts,
    zombieRecap,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getCurrentWeek(leagueId: string): Promise<number> {
  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    select: { currentWeek: true },
  }).catch(() => null)
  return season?.currentWeek ?? 1
}
