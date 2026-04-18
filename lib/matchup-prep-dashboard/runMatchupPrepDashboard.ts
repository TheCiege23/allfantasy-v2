import 'server-only'

import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { openaiChatText } from '@/lib/openai-client'
import { runStartSitAnalysis } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import type { StartSitAnalyzeResult, StartSitPlayerRow } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import { normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  MatchupPrepDashboardInput,
  MatchupPrepDashboardOutput,
  MatchupGamePlanAction,
  MatchupPositionEdge,
} from './types'

const SLEEPER = 'https://api.sleeper.app/v1'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10
}

function isStartSitOk(v: unknown): v is StartSitAnalyzeResult {
  return typeof v === 'object' && v !== null && 'recommendations' in v
}

function getStarterIds(playerData: unknown): string[] {
  if (!playerData || typeof playerData !== 'object' || Array.isArray(playerData)) return []
  const s = (playerData as Record<string, unknown>).starters
  if (!Array.isArray(s)) return []
  return s.map((x) => String(x)).filter(Boolean)
}

function normPos(p: string): string {
  const u = p.toUpperCase()
  if (u.includes('QB')) return 'QB'
  if (u.includes('RB')) return 'RB'
  if (u.includes('WR')) return 'WR'
  if (u.includes('TE')) return 'TE'
  if (u.includes('K')) return 'K'
  if (u.includes('DEF') || u.includes('DST')) return 'DST'
  if (u.includes('FLEX')) return 'FLEX'
  return u.slice(0, 4)
}

function sumLineup(
  players: StartSitPlayerRow[],
  starterIds: Set<string>,
): { total: number; byPos: Record<string, number> } {
  const byPos: Record<string, number> = {}
  let total = 0
  const useStarters = starterIds.size > 0
  for (const p of players) {
    if (p.projectedPoints == null) continue
    if (useStarters && !starterIds.has(p.playerId)) continue
    const k = normPos(p.position)
    byPos[k] = (byPos[k] ?? 0) + p.projectedPoints
    total += p.projectedPoints
  }
  return { total: roundToTenth(total), byPos }
}

function mapStrategyToStartSitMode(
  m: MatchupPrepDashboardInput['strategyMode'],
): 'balanced' | 'safe' | 'upside' {
  switch (m) {
    case 'safe_floor':
    case 'injury_protected':
      return 'safe'
    case 'high_upside':
    case 'aggressive':
      return 'upside'
    default:
      return 'balanced'
  }
}

function weekParamFromHorizon(h: MatchupPrepDashboardInput['timeHorizon']): string {
  switch (h) {
    case 'next_matchup':
      return 'next'
    case 'this_matchup':
    default:
      return 'current'
  }
}

type SleeperMatchup = { roster_id?: number; matchup_id?: number; points?: number }

async function resolveSleeperOpponentExternalId(args: {
  leagueId: string
  userId: string
  week: number
  platformLeagueId: string
}): Promise<{ opponentExternalId: string | null; opponentName: string | null; notes: string[] }> {
  const notes: string[] = []
  try {
    let owner =
      (await prisma.userProfile.findUnique({ where: { userId: args.userId }, select: { sleeperUserId: true } }))
        ?.sleeperUserId?.trim() || args.userId
    const [rostersRes, matchRes, usersRes] = await Promise.all([
      fetch(`${SLEEPER}/league/${encodeURIComponent(args.platformLeagueId)}/rosters`, { next: { revalidate: 30 } }),
      fetch(`${SLEEPER}/league/${encodeURIComponent(args.platformLeagueId)}/matchups/${args.week}`, {
        next: { revalidate: 30 },
      }),
      fetch(`${SLEEPER}/league/${encodeURIComponent(args.platformLeagueId)}/users`, { next: { revalidate: 120 } }),
    ])
    const rosters = rostersRes.ok ? ((await rostersRes.json()) as { roster_id?: number; owner_id?: string }[]) : []
    const matchups = matchRes.ok ? ((await matchRes.json()) as SleeperMatchup[]) : []
    const users = usersRes.ok
      ? ((await usersRes.json()) as {
          user_id?: string
          display_name?: string
          metadata?: { team_name?: string }
        }[])
      : []

    const mine = Array.isArray(rosters) ? rosters.find((r) => String(r.owner_id) === String(owner)) : undefined
    const rid = mine?.roster_id
    if (rid == null) {
      notes.push('Could not resolve your Sleeper roster for this league week.')
      return { opponentExternalId: null, opponentName: null, notes }
    }
    const row = Array.isArray(matchups) ? matchups.find((m) => m.roster_id === rid) : undefined
    const mid = row?.matchup_id
    if (mid == null) {
      notes.push('Sleeper matchups not available for this week yet.')
      return { opponentExternalId: null, opponentName: null, notes }
    }
    const opp = Array.isArray(matchups) ? matchups.find((m) => m.roster_id !== rid && m.matchup_id === mid) : undefined
    const oppRoster = opp ? rosters.find((r) => r.roster_id === opp.roster_id) : undefined
    const oppOwner = oppRoster?.owner_id
    const u = Array.isArray(users) ? users.find((x) => String(x.user_id) === String(oppOwner)) : undefined
    const name =
      u?.metadata?.team_name?.trim() ||
      u?.display_name?.trim() ||
      (oppOwner ? `Opponent (${String(oppOwner).slice(0, 8)}…)` : null)
    const oppRid = opp?.roster_id
    if (oppRid == null) {
      notes.push('Opponent roster not found in Sleeper matchups response.')
      return { opponentName: name, opponentExternalId: null, notes }
    }
    const externalId = String(oppRid)
    const lt = await prisma.leagueTeam.findFirst({
      where: { leagueId: args.leagueId, externalId },
      select: { externalId: true },
    })
    if (!lt) {
      notes.push('Opponent Sleeper roster id not yet linked in league_teams — sync may be pending.')
    }
    return { opponentExternalId: lt?.externalId ?? externalId, opponentName: name, notes }
  } catch {
    notes.push('Sleeper opponent resolution failed.')
    return { opponentExternalId: null, opponentName: null, notes }
  }
}

function buildPositionEdges(myBy: Record<string, number>, oppBy: Record<string, number>): MatchupPositionEdge[] {
  const keys = new Set([...Object.keys(myBy), ...Object.keys(oppBy)])
  const out: MatchupPositionEdge[] = []
  for (const position of keys) {
    const myPoints = roundToTenth(myBy[position] ?? 0)
    const oppPoints = roundToTenth(oppBy[position] ?? 0)
    out.push({ position, myPoints, oppPoints, edge: roundToTenth(myPoints - oppPoints) })
  }
  out.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
  return out
}

function winProbFromEdge(edge: number): number {
  /* Logistic-style curve: 0 edge -> ~50%, +8 pts -> ~72% */
  const p = 1 / (1 + Math.exp(-edge / 6.5))
  return clamp(Math.round(p * 100), 5, 95)
}

function buildGamePlan(args: {
  my: StartSitAnalyzeResult
  opp: StartSitAnalyzeResult
  edge: number
}): MatchupGamePlanAction[] {
  const actions: MatchupGamePlanAction[] = []
  let rank = 1
  const push = (a: Omit<MatchupGamePlanAction, 'rank'>) => {
    actions.push({ ...a, rank: rank++ })
  }

  if (args.my.recommendations.bestStart) {
    push({
      id: 'ss-start',
      title: `Start ${args.my.recommendations.bestStart.player.name}`,
      detail: args.my.recommendations.bestStart.reason,
      urgency: 78,
      confidence: args.my.recommendations.bestStart.confidence,
      source: 'start_sit',
      linkTool: 'startSit',
    })
  }
  if (args.my.recommendations.bestSit) {
    push({
      id: 'ss-sit',
      title: `Sit ${args.my.recommendations.bestSit.player.name}`,
      detail: args.my.recommendations.bestSit.reason,
      urgency: 62,
      confidence: args.my.recommendations.bestSit.confidence,
      source: 'start_sit',
      linkTool: 'startSit',
    })
  }
  if (args.edge < -3) {
    push({
      id: 'underdog',
      title: 'Underdog projection — lean upside',
      detail: 'Projected behind opponent; consider ceiling plays where injury risk is acceptable.',
      urgency: 70,
      confidence: 55,
      source: 'projection',
      linkTool: 'startSit',
    })
  } else if (args.edge > 3) {
    push({
      id: 'favorite',
      title: 'Protect the lead',
      detail: 'Projected ahead — safer floors at volatile slots can preserve edge.',
      urgency: 52,
      confidence: 58,
      source: 'projection',
      linkTool: 'startSit',
    })
  }

  const injMy = args.my.players.filter((p) => p.injuryStatus && /out|doubt|quest|ir/i.test(p.injuryStatus)).slice(0, 2)
  for (const p of injMy) {
    push({
      id: `inj-${p.playerId}`,
      title: `Monitor ${p.name}`,
      detail: p.injuryStatus ?? 'Injury designation',
      urgency: 72,
      confidence: 50,
      source: 'injury',
      linkTool: 'injury',
    })
  }

  return actions.slice(0, 8)
}

export async function runMatchupPrepDashboard(input: MatchupPrepDashboardInput): Promise<MatchupPrepDashboardOutput> {
  const dataGaps: string[] = []
  const computedAt = new Date().toISOString()

  if (!input.leagueId?.trim()) {
    return {
      ok: false,
      error: 'Select a league for matchup prep.',
      code: 'VALIDATION',
    }
  }

  const access = await assertLeagueMember(input.leagueId.trim(), input.userId)
  if (!access.ok) {
    return { ok: false, error: 'League not found or access denied.', code: 'FORBIDDEN' }
  }

  const leagueRow = await prisma.league.findFirst({
    where: { id: input.leagueId.trim() },
    include: { teams: true },
  })
  if (!leagueRow) {
    return { ok: false, error: 'League not found.', code: 'VALIDATION' }
  }

  const sport = normalizeToSupportedSport(String(leagueRow.sport))
  if (!SUPPORTED_SPORTS.includes(sport)) {
    dataGaps.push(`Sport ${String(leagueRow.sport)} normalized for analysis.`)
  }

  if (input.sportFilter !== 'ALL' && input.sportFilter.toUpperCase() !== String(leagueRow.sport).toUpperCase()) {
    dataGaps.push('Sport filter does not match league sport — using league data.')
  }

  const weekStr = weekParamFromHorizon(input.timeHorizon)
  if (input.timeHorizon === 'next_2_matchups' || input.timeHorizon === 'playoff_window' || input.timeHorizon === 'rest_of_season') {
    dataGaps.push('Horizon uses current/next week scoring only; multi-week aggregation coming with schedule API.')
  }

  const myTeamExt =
    input.teamFocus === 'specific_team' && input.teamExternalId?.trim() ? input.teamExternalId.trim() : null

  const mode = mapStrategyToStartSitMode(input.strategyMode)

  const mySs = await runStartSitAnalysis({
    userId: input.userId,
    sportFilter: 'ALL',
    leagueId: input.leagueId.trim(),
    week: weekStr,
    mode,
    teamExternalId: myTeamExt,
  })

  if (!isStartSitOk(mySs)) {
    return {
      ok: false,
      error: (mySs as { error?: string }).error ?? 'Could not load your roster for matchup prep.',
      code: 'VALIDATION',
    }
  }

  let oppExternal = input.opponentExternalId?.trim() || null
  const scheduleNotes: string[] = [...mySs.matchupNotes]

  if (!oppExternal && leagueRow.platform?.toLowerCase() === 'sleeper' && leagueRow.platformLeagueId && sport === 'NFL') {
    const resolved = await resolveSleeperOpponentExternalId({
      leagueId: input.leagueId.trim(),
      userId: input.userId,
      week: mySs.week,
      platformLeagueId: leagueRow.platformLeagueId.trim(),
    })
    scheduleNotes.push(...resolved.notes)
    oppExternal = resolved.opponentExternalId
    if (!oppExternal) {
      dataGaps.push('Select an opponent manually if auto-matchup did not resolve.')
    }
  } else if (!oppExternal) {
    dataGaps.push('Opponent auto-select requires Sleeper NFL league with synced matchups — pick opponent from list.')
  }

  let oppSs: StartSitAnalyzeResult | null = null
  if (oppExternal) {
    const oppRes = await runStartSitAnalysis({
      userId: input.userId,
      sportFilter: 'ALL',
      leagueId: input.leagueId.trim(),
      week: weekStr,
      mode: 'balanced',
      teamExternalId: oppExternal,
    })
    if (isStartSitOk(oppRes)) {
      oppSs = oppRes
    } else {
      dataGaps.push(`Opponent roster: ${(oppRes as { error?: string }).error ?? 'unavailable'}`)
    }
  }

  let myRosterRow = await prisma.roster.findFirst({
    where: { leagueId: input.leagueId.trim(), platformUserId: input.userId },
    select: { playerData: true },
  })
  if (myTeamExt) {
    const myLtForRoster = await prisma.leagueTeam.findFirst({
      where: { leagueId: input.leagueId.trim(), externalId: myTeamExt },
      select: { platformUserId: true },
    })
    if (myLtForRoster?.platformUserId) {
      const r = await prisma.roster.findFirst({
        where: { leagueId: input.leagueId.trim(), platformUserId: myLtForRoster.platformUserId },
        select: { playerData: true },
      })
      if (r) myRosterRow = r
    }
  }

  let oppRosterRow: { playerData: unknown } | null = null
  if (oppExternal) {
    const lt = await prisma.leagueTeam.findFirst({
      where: { leagueId: input.leagueId.trim(), externalId: oppExternal },
      select: { platformUserId: true },
    })
    if (lt?.platformUserId) {
      oppRosterRow = await prisma.roster.findFirst({
        where: { leagueId: input.leagueId.trim(), platformUserId: lt.platformUserId },
        select: { playerData: true },
      })
    }
  }

  const myStarters = new Set(getStarterIds(myRosterRow?.playerData))
  const oppStarters = new Set(getStarterIds(oppRosterRow?.playerData))
  if (myStarters.size === 0) {
    dataGaps.push('Starter slots not synced in roster JSON — totals use all projected players (may overcount).')
  }

  const myLine = sumLineup(mySs.players, myStarters)
  const oppLine = oppSs ? sumLineup(oppSs.players, oppStarters) : { total: 0, byPos: {} }

  const myTotal = myLine.total > 0 ? myLine.total : null
  const oppTotal = oppSs && oppLine.total > 0 ? oppLine.total : null

  const edge = myTotal != null && oppTotal != null ? roundToTenth(myTotal - oppTotal) : null
  const winProbability = edge != null ? winProbFromEdge(edge) : null

  let matchupDifficulty: 'favorable' | 'even' | 'tough' = 'even'
  if (edge != null) {
    if (edge >= 3) matchupDifficulty = 'favorable'
    else if (edge <= -3) matchupDifficulty = 'tough'
  }

  const positionEdges = oppSs ? buildPositionEdges(myLine.byPos, oppLine.byPos) : []

  const oppWeaknesses = positionEdges.filter((e) => e.edge > 0).slice(0, 4)
  const oppStrengths = positionEdges.filter((e) => e.edge < 0).slice(0, 4)

  const gamePlan =
    oppSs != null && edge != null
      ? buildGamePlan({ my: mySs, opp: oppSs, edge })
      : buildGamePlan({ my: mySs, opp: mySs, edge: 0 })

  const injuryHighlights: Array<{ side: 'you' | 'opp'; name: string; status: string; note: string }> = []
  for (const p of mySs.players.slice(0, 24)) {
    if (p.injuryStatus && p.injuryStatus.length > 2) {
      injuryHighlights.push({ side: 'you', name: p.name, status: p.injuryStatus, note: 'Your roster' })
    }
  }
  if (oppSs) {
    for (const p of oppSs.players.slice(0, 24)) {
      if (p.injuryStatus && p.injuryStatus.length > 2) {
        injuryHighlights.push({ side: 'opp', name: p.name, status: p.injuryStatus, note: 'Opponent roster' })
      }
    }
  }

  const conflicts: Array<{ id: string; summary: string; primary: string; alternate: string }> = []
  if (edge != null && edge > 2 && mode === 'upside') {
    conflicts.push({
      id: 'c1',
      summary: 'You project ahead but strategy asks for upside — consider safer floor to protect lead.',
      primary: 'Use upside at volatile slots only.',
      alternate: 'Play safest projected starters across the board.',
    })
  }

  const confidence = Math.round(
    clamp(
      (mySs.confidenceScore + (oppSs?.confidenceScore ?? 55)) / 2 - dataGaps.length * 2 - (oppSs ? 0 : 8),
      18,
      92,
    ),
  )

  const degraded = dataGaps.length > 0 || !oppSs || oppTotal == null

  const myLt = await prisma.leagueTeam.findFirst({
    where: myTeamExt
      ? { leagueId: input.leagueId.trim(), externalId: myTeamExt }
      : { leagueId: input.leagueId.trim(), claimedByUserId: input.userId },
    select: { teamName: true, wins: true, losses: true, ties: true },
  })
  const oppLt = oppExternal
    ? await prisma.leagueTeam.findFirst({
        where: { leagueId: input.leagueId.trim(), externalId: oppExternal },
        select: { teamName: true, wins: true, losses: true, ties: true },
      })
    : null

  const recStr = (w: number, l: number, t: number) =>
    `${w}-${l}${t > 0 ? `-${t}` : ''}`

  let aiSummary: string | null = null
  if (!input.skipAi) {
    const payload = {
      week: mySs.week,
      myTeam: myLt?.teamName ?? mySs.teamContext.teamName,
      oppTeam: oppLt?.teamName ?? mySs.opponent?.name,
      myProj: myTotal,
      oppProj: oppTotal,
      edge,
      winProbability,
      positionEdges: positionEdges.slice(0, 8),
      dataGaps,
    }
    const ai = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are Chimmy. Write 4–6 sentences for fantasy matchup prep. Use ONLY numbers and names from the JSON. Never invent players, injuries, or scores. If opponent data is missing, say so.',
        },
        { role: 'user', content: JSON.stringify(payload).slice(0, 10000) },
      ],
      temperature: 0.35,
      maxTokens: 450,
      skipCache: true,
    })
    aiSummary = ai.ok ? ai.text : null
    if (!ai.ok) dataGaps.push('AI summary unavailable (provider).')
  }

  const chimmyPayload: Record<string, unknown> = {
    tool: 'matchup_prep',
    leagueId: input.leagueId.trim(),
    leagueName: leagueRow.name,
    sport,
    week: mySs.week,
    myProjectedTotal: myTotal,
    oppProjectedTotal: oppTotal,
    edge,
    winProbability,
    opponentWeaknesses: oppWeaknesses.map((e) => e.position),
    opponentStrengths: oppStrengths.map((e) => e.position),
    dataGaps,
    degraded,
    computedAt,
  }

  return {
    ok: true,
    analysisScope: 'league',
    leagueName: leagueRow.name,
    sport: String(leagueRow.sport),
    week: mySs.week,
    weekLabel: mySs.weekLabel,
    myTeamName: myLt?.teamName ?? mySs.teamContext.teamName,
    oppTeamName: oppLt?.teamName ?? mySs.opponent?.name ?? null,
    myRecord: myLt ? recStr(myLt.wins, myLt.losses, myLt.ties) : mySs.teamContext.record,
    oppRecord: oppLt ? recStr(oppLt.wins, oppLt.losses, oppLt.ties) : null,
    myProjectedTotal: myTotal,
    oppProjectedTotal: oppTotal,
    projectedEdge: edge,
    winProbability,
    confidence,
    matchupDifficulty,
    positionEdges,
    gamePlan,
    conflicts,
    injuryHighlights: injuryHighlights.slice(0, 12),
    scheduleNotes: scheduleNotes.slice(0, 8),
    dataGaps,
    degraded,
    modules: {
      myStartSit: JSON.parse(JSON.stringify(mySs)) as Record<string, unknown>,
      oppStartSit: oppSs ? (JSON.parse(JSON.stringify(oppSs)) as Record<string, unknown>) : null,
    },
    aiSummary,
    chimmyPayload,
    computedAt,
  }
}
