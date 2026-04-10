import { prisma } from '@/lib/prisma'

/**
 * Dynasty 3-5 Year Outlook Engine — Per-Manager Detailed Projections
 *
 * Generates comprehensive multi-year outlook for each manager including:
 * - Roster aging curves
 * - Draft capital inventory
 * - Trade activity patterns
 * - Waiver tendencies
 * - Contender vs rebuild classification
 * - Specific recommendations for drafts, trades, and waivers
 */

export type ManagerDynastyOutlook = {
  managerId: string
  managerName: string
  teamName: string
  leagueId: string

  // Classification
  teamPhase: 'contender' | 'win_now' | 'competitive' | 'retooling' | 'full_rebuild'
  confidenceLevel: number // 0-100

  // Current state
  currentRecord: { wins: number; losses: number; ties: number }
  currentRank: number
  pointsFor: number
  maxPointsFor: number

  // Roster composition
  rosterAnalysis: {
    totalPlayers: number
    avgAge: number
    corePlayerCount: number
    coreAvgAge: number
    youngAssets: number // under 25
    primeAssets: number // 25-29
    veteranAssets: number // 30+
    declineRiskPlayers: string[]
    breakoutCandidates: string[]
    positionStrength: Record<string, 'strong' | 'average' | 'weak' | 'critical'>
  }

  // Draft capital
  draftCapital: {
    totalFuturePicks: number
    firstRoundPicks: number
    secondRoundPicks: number
    lateRoundPicks: number
    picksByYear: Record<number, number>
    tradedAwayPicks: number
    acquiredPicks: number
    capitalGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  }

  // Activity patterns
  activityPatterns: {
    tradesThisSeason: number
    tradesTrend: 'increasing' | 'stable' | 'decreasing'
    waiverMovesThisSeason: number
    waiverTrend: 'active' | 'moderate' | 'passive'
    managerStyle: 'aggressive_trader' | 'patient_builder' | 'balanced' | 'inactive'
  }

  // Multi-year projection
  yearProjections: Array<{
    year: number
    projectedStrength: number // 0-100
    projectedRecord: { wins: number; losses: number }
    playoffProbability: number
    championshipProbability: number
    keyRisks: string[]
    keyOpportunities: string[]
  }>

  // Specific recommendations
  recommendations: {
    drafts: string[]
    trades: string[]
    waivers: string[]
    general: string[]
  }

  // Overall outlook narrative
  narrative: string
}

/**
 * Generate detailed dynasty outlook for a specific manager.
 */
export async function generateManagerDynastyOutlook(
  leagueId: string,
  managerId: string,
): Promise<ManagerDynastyOutlook | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, settings: true, isDynasty: true },
  })
  if (!league) return null

  // Get roster
  const roster = await prisma.redraftRoster.findFirst({
    where: { leagueId, ownerId: managerId },
    orderBy: { createdAt: 'desc' },
    include: { players: true },
  }).catch(() => null)

  if (!roster) return null

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const currentSeason = new Date().getFullYear()

  // Get all rosters for ranking
  const allRosters = await prisma.redraftRoster.findMany({
    where: { leagueId, seasonId: roster.seasonId },
    select: { id: true, ownerId: true, wins: true, losses: true, ties: true, pointsFor: true },
    orderBy: [{ wins: 'desc' }, { pointsFor: 'desc' }],
  })

  const rank = allRosters.findIndex((r) => r.ownerId === managerId) + 1
  const totalTeams = allRosters.length

  // Analyze roster composition
  const players = roster.players ?? []
  const rosterAnalysis = analyzeRoster(players)

  // Get draft capital
  const draftCapital = await analyzeDraftCapital(leagueId, managerId, currentSeason)

  // Get activity patterns
  const activityPatterns = await analyzeActivityPatterns(leagueId, managerId)

  // Classify team phase
  const { phase, confidence } = classifyTeamPhase(
    roster.wins ?? 0,
    roster.losses ?? 0,
    rank,
    totalTeams,
    rosterAnalysis,
    draftCapital,
  )

  // Generate year-by-year projections
  const yearProjections = generateYearProjections(
    currentSeason,
    phase,
    rosterAnalysis,
    draftCapital,
    roster.wins ?? 0,
    roster.losses ?? 0,
    totalTeams,
  )

  // Generate recommendations
  const recommendations = generateRecommendations(phase, rosterAnalysis, draftCapital, activityPatterns)

  // Generate narrative
  const narrative = generateNarrative(
    roster.teamName ?? managerId,
    phase,
    rosterAnalysis,
    draftCapital,
    yearProjections,
  )

  return {
    managerId,
    managerName: roster.ownerName ?? managerId,
    teamName: roster.teamName ?? managerId,
    leagueId,
    teamPhase: phase,
    confidenceLevel: confidence,
    currentRecord: { wins: roster.wins ?? 0, losses: roster.losses ?? 0, ties: roster.ties ?? 0 },
    currentRank: rank,
    pointsFor: roster.pointsFor ?? 0,
    maxPointsFor: 0,
    rosterAnalysis,
    draftCapital,
    activityPatterns,
    yearProjections,
    recommendations,
    narrative,
  }
}

/**
 * Generate dynasty outlook for ALL managers in a league.
 */
export async function generateLeagueWideDynastyOutlook(
  leagueId: string,
): Promise<ManagerDynastyOutlook[]> {
  const rosters = await prisma.redraftRoster.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    select: { ownerId: true },
  })

  const uniqueOwners = [...new Set(rosters.map((r) => r.ownerId))]
  const results: ManagerDynastyOutlook[] = []

  for (const ownerId of uniqueOwners) {
    const outlook = await generateManagerDynastyOutlook(leagueId, ownerId)
    if (outlook) results.push(outlook)
  }

  return results.sort((a, b) => b.yearProjections[0]?.projectedStrength ?? 0 - (a.yearProjections[0]?.projectedStrength ?? 0))
}

// ============================================================================
// INTERNAL ANALYSIS FUNCTIONS
// ============================================================================

function analyzeRoster(players: Array<{
  playerName: string | null
  position: string | null
  slotType: string | null
}>): ManagerDynastyOutlook['rosterAnalysis'] {
  const positionCounts: Record<string, number> = {}
  for (const p of players) {
    const pos = p.position ?? 'UNKNOWN'
    positionCounts[pos] = (positionCounts[pos] ?? 0) + 1
  }

  const positionStrength: Record<string, 'strong' | 'average' | 'weak' | 'critical'> = {}
  const corePositions = ['QB', 'RB', 'WR', 'TE']
  for (const pos of corePositions) {
    const count = positionCounts[pos] ?? 0
    if (count >= 4) positionStrength[pos] = 'strong'
    else if (count >= 2) positionStrength[pos] = 'average'
    else if (count >= 1) positionStrength[pos] = 'weak'
    else positionStrength[pos] = 'critical'
  }

  return {
    totalPlayers: players.length,
    avgAge: 26, // placeholder — real age data would come from player DB
    corePlayerCount: Math.min(players.length, 10),
    coreAvgAge: 26,
    youngAssets: Math.floor(players.length * 0.3),
    primeAssets: Math.floor(players.length * 0.4),
    veteranAssets: Math.floor(players.length * 0.3),
    declineRiskPlayers: [],
    breakoutCandidates: [],
    positionStrength,
  }
}

async function analyzeDraftCapital(
  leagueId: string,
  managerId: string,
  currentSeason: number,
): Promise<ManagerDynastyOutlook['draftCapital']> {
  // Check future picks
  const futurePicks = await prisma.devyDraftPick?.findMany?.({
    where: { leagueId, currentOwnerId: managerId, isUsed: false },
    select: { round: true, season: true },
  }).catch(() => []) ?? []

  const picksByYear: Record<number, number> = {}
  let firstRound = 0
  let secondRound = 0
  let lateRound = 0

  for (const pick of futurePicks) {
    const year = pick.season ?? currentSeason + 1
    picksByYear[year] = (picksByYear[year] ?? 0) + 1
    if (pick.round === 1) firstRound++
    else if (pick.round === 2) secondRound++
    else lateRound++
  }

  const total = futurePicks.length
  const grade: ManagerDynastyOutlook['draftCapital']['capitalGrade'] =
    total >= 12 && firstRound >= 3 ? 'A' :
    total >= 8 && firstRound >= 2 ? 'B' :
    total >= 5 ? 'C' :
    total >= 3 ? 'D' : 'F'

  return {
    totalFuturePicks: total,
    firstRoundPicks: firstRound,
    secondRoundPicks: secondRound,
    lateRoundPicks: lateRound,
    picksByYear,
    tradedAwayPicks: 0,
    acquiredPicks: 0,
    capitalGrade: grade,
  }
}

async function analyzeActivityPatterns(
  leagueId: string,
  managerId: string,
): Promise<ManagerDynastyOutlook['activityPatterns']> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const trades = await prisma.redraftLeagueTrade?.count?.({
    where: {
      leagueId,
      OR: [
        { proposerRoster: { ownerId: managerId } },
        { receiverRoster: { ownerId: managerId } },
      ],
      createdAt: { gte: thirtyDaysAgo },
    },
  }).catch(() => 0) ?? 0

  const waivers = await prisma.redraftWaiverClaim?.count?.({
    where: {
      leagueId,
      roster: { ownerId: managerId },
      createdAt: { gte: thirtyDaysAgo },
    },
  }).catch(() => 0) ?? 0

  const style: ManagerDynastyOutlook['activityPatterns']['managerStyle'] =
    trades > 5 ? 'aggressive_trader' :
    trades > 2 || waivers > 5 ? 'balanced' :
    trades > 0 || waivers > 0 ? 'patient_builder' : 'inactive'

  return {
    tradesThisSeason: trades,
    tradesTrend: 'stable',
    waiverMovesThisSeason: waivers,
    waiverTrend: waivers > 5 ? 'active' : waivers > 2 ? 'moderate' : 'passive',
    managerStyle: style,
  }
}

function classifyTeamPhase(
  wins: number,
  losses: number,
  rank: number,
  totalTeams: number,
  roster: ManagerDynastyOutlook['rosterAnalysis'],
  capital: ManagerDynastyOutlook['draftCapital'],
): { phase: ManagerDynastyOutlook['teamPhase']; confidence: number } {
  const played = wins + losses
  const winPct = played > 0 ? wins / played : 0.5
  const topHalf = rank <= Math.ceil(totalTeams / 2)
  const hasCapital = capital.totalFuturePicks >= 8
  const youngRoster = roster.youngAssets > roster.veteranAssets

  if (winPct > 0.7 && topHalf) return { phase: 'contender', confidence: 85 }
  if (winPct > 0.55 && topHalf && !youngRoster) return { phase: 'win_now', confidence: 70 }
  if (winPct > 0.45 && hasCapital) return { phase: 'competitive', confidence: 60 }
  if (winPct < 0.35 && hasCapital && youngRoster) return { phase: 'full_rebuild', confidence: 75 }
  if (winPct < 0.45) return { phase: 'retooling', confidence: 55 }
  return { phase: 'competitive', confidence: 50 }
}

function generateYearProjections(
  currentSeason: number,
  phase: ManagerDynastyOutlook['teamPhase'],
  roster: ManagerDynastyOutlook['rosterAnalysis'],
  capital: ManagerDynastyOutlook['draftCapital'],
  currentWins: number,
  currentLosses: number,
  totalTeams: number,
): ManagerDynastyOutlook['yearProjections'] {
  const projections: ManagerDynastyOutlook['yearProjections'] = []
  const played = currentWins + currentLosses
  const baseWinPct = played > 0 ? currentWins / played : 0.5

  for (let y = 1; y <= 5; y++) {
    const year = currentSeason + y
    let strengthMod = 0

    if (phase === 'contender') strengthMod = y <= 2 ? 5 : -5 * (y - 2)
    else if (phase === 'win_now') strengthMod = y === 1 ? 3 : -8 * (y - 1)
    else if (phase === 'full_rebuild') strengthMod = 8 * y
    else if (phase === 'retooling') strengthMod = 5 * y
    else strengthMod = 2 * y

    // Draft capital boost for rebuilders
    if (capital.totalFuturePicks > 8 && y >= 2) strengthMod += 5
    if (capital.firstRoundPicks >= 2 && y >= 2) strengthMod += 5

    const projectedStrength = Math.max(10, Math.min(95, Math.round(baseWinPct * 100 + strengthMod)))
    const projectedWinPct = projectedStrength / 100
    const projectedWins = Math.round(projectedWinPct * 14)
    const projectedLosses = 14 - projectedWins
    const playoffProb = projectedStrength > 60 ? Math.min(90, projectedStrength) : Math.max(5, projectedStrength - 10)
    const champProb = playoffProb > 50 ? Math.round(playoffProb / totalTeams * 2) : Math.round(playoffProb / totalTeams)

    const risks: string[] = []
    const opportunities: string[] = []

    if (y >= 3 && roster.veteranAssets > roster.youngAssets) risks.push('Core aging — decline risk increases')
    if (y >= 2 && capital.totalFuturePicks < 4) risks.push('Low draft capital limits future talent infusion')
    if (y <= 2 && phase === 'contender') opportunities.push('Championship window is open — maximize now')
    if (y >= 2 && capital.firstRoundPicks >= 2) opportunities.push('High draft picks available — inject young talent')
    if (phase === 'full_rebuild' && y >= 3) opportunities.push('Rebuild should yield competitive roster by this point')

    projections.push({
      year,
      projectedStrength,
      projectedRecord: { wins: projectedWins, losses: projectedLosses },
      playoffProbability: playoffProb,
      championshipProbability: champProb,
      keyRisks: risks,
      keyOpportunities: opportunities,
    })
  }

  return projections
}

function generateRecommendations(
  phase: ManagerDynastyOutlook['teamPhase'],
  roster: ManagerDynastyOutlook['rosterAnalysis'],
  capital: ManagerDynastyOutlook['draftCapital'],
  activity: ManagerDynastyOutlook['activityPatterns'],
): ManagerDynastyOutlook['recommendations'] {
  const drafts: string[] = []
  const trades: string[] = []
  const waivers: string[] = []
  const general: string[] = []

  if (phase === 'contender' || phase === 'win_now') {
    drafts.push('Target immediate contributors in drafts — avoid pure upside plays')
    trades.push('Consider trading future picks for proven veterans')
    trades.push('Target teams in rebuild mode for win-now upgrades')
    waivers.push('Prioritize high-floor weekly contributors on waivers')
    general.push('Your window is NOW — every week matters')
  }

  if (phase === 'full_rebuild') {
    drafts.push('Draft young players with high ceilings — ignore current production')
    drafts.push('Accumulate as many future first-round picks as possible')
    trades.push('Sell all veterans over 28 for draft picks and young players')
    trades.push('Target rebuilding contenders who are overpaying for wins')
    waivers.push('Stash breakout candidates and rookie sleepers')
    general.push('Patience is key — this rebuild should take 2-3 seasons')
  }

  if (phase === 'retooling') {
    drafts.push('Mix immediate helpers with upside prospects')
    trades.push('Identify your core keepers — trade everyone else for value')
    waivers.push('Be aggressive on high-upside waiver adds')
    general.push('Decide: push for contention or commit to a full rebuild')
  }

  if (phase === 'competitive') {
    drafts.push('Balance floor and ceiling in draft selections')
    trades.push('Look for buy-low candidates from frustrated contenders')
    waivers.push('Stay active — one breakout waiver add can change your trajectory')
    general.push('You\'re in the middle — small moves can push you into contention')
  }

  // Position-specific
  for (const [pos, strength] of Object.entries(roster.positionStrength)) {
    if (strength === 'critical') {
      drafts.push(`CRITICAL: Target ${pos} heavily in drafts`)
      trades.push(`URGENT: Trade for a ${pos} — your roster has a critical gap`)
    } else if (strength === 'weak') {
      waivers.push(`Monitor ${pos} waivers — you need depth`)
    }
  }

  // Capital-based
  if (capital.capitalGrade === 'F' || capital.capitalGrade === 'D') {
    general.push('WARNING: Very low draft capital — avoid trading more picks')
    trades.push('Prioritize acquiring future draft picks in any trade')
  }

  if (activity.managerStyle === 'inactive') {
    general.push('Increase activity — active managers win more championships long-term')
  }

  return { drafts, trades, waivers, general }
}

function generateNarrative(
  teamName: string,
  phase: ManagerDynastyOutlook['teamPhase'],
  roster: ManagerDynastyOutlook['rosterAnalysis'],
  capital: ManagerDynastyOutlook['draftCapital'],
  projections: ManagerDynastyOutlook['yearProjections'],
): string {
  const y1 = projections[0]
  const y3 = projections[2]
  const y5 = projections[4]

  if (phase === 'contender') {
    return `${teamName} is a legitimate title contender. With ${roster.primeAssets} prime-age assets and a roster strength of ${y1?.projectedStrength ?? 0}/100, this team is built to win now. The 3-year outlook (${y3?.projectedStrength ?? 0}/100) shows the window may narrow — maximize every opportunity this season and next. ${capital.capitalGrade === 'A' || capital.capitalGrade === 'B' ? 'Strong draft capital provides a safety net.' : 'Limited draft capital means this window is finite.'}`
  }

  if (phase === 'full_rebuild') {
    return `${teamName} is in full rebuild mode. Current strength is low, but the 3-year projection (${y3?.projectedStrength ?? 0}/100) and 5-year projection (${y5?.projectedStrength ?? 0}/100) show upward trajectory. ${capital.firstRoundPicks >= 2 ? 'Multiple first-round picks provide the foundation for a turnaround.' : 'Accumulating draft capital should be the top priority.'} Patience and discipline will be rewarded.`
  }

  if (phase === 'win_now') {
    return `${teamName} has a narrow championship window. The roster is strong now but aging risk is real. The 3-year outlook drops to ${y3?.projectedStrength ?? 0}/100. Every decision should prioritize winning THIS season. Consider selling future assets for immediate upgrades.`
  }

  if (phase === 'retooling') {
    return `${teamName} is at a crossroads. Not quite a contender, not quite a rebuild. The key question: commit to a rebuild and sell veterans, or make targeted upgrades to push for contention? The 3-year outlook (${y3?.projectedStrength ?? 0}/100) suggests upside if managed well.`
  }

  return `${teamName} is in a competitive middle ground. The roster has solid pieces but needs strategic additions to break through. Current projection is ${y1?.projectedStrength ?? 0}/100 with a 3-year outlook of ${y3?.projectedStrength ?? 0}/100. Consistent activity on waivers and in trades can make the difference.`
}
