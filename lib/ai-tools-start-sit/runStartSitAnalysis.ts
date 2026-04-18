import 'server-only'

import type { SportsPlayerRecord } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { loadLeagueForTrade } from '@/lib/trade-value-console/league-loader'
import { snapshotFromLoaded } from '@/lib/trade-value-console/quick-badges'
import { sportsRecordToPricedAsset } from '@/lib/trade-value-console/sports-db-valuation'
import { fetchRollingInsights } from '@/lib/upstream-apis'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { getPlayerNews } from '@/lib/data/players'

const SLEEPER = 'https://api.sleeper.app/v1'

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function projFromProjections(projections: unknown): number | null {
  if (!projections || typeof projections !== 'object' || Array.isArray(projections)) return null
  const o = projections as Record<string, unknown>
  for (const k of ['fantasyPoints', 'projectedPoints', 'points', 'fp', 'total', 'week']) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  }
  return null
}

function recentFpgFromStats(stats: unknown): number | null {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return null
  const o = stats as Record<string, unknown>
  for (const k of ['fantasyPointsPerGame', 'fppg', 'avgPoints', 'avg_fp']) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function volFromInjury(status: string | null | undefined): number {
  if (!status) return 0.22
  const s = status.toLowerCase()
  if (s.includes('out') || s.includes('ir')) return 0.45
  if (s.includes('doubt')) return 0.4
  if (s.includes('quest')) return 0.32
  if (s.includes('prob')) return 0.26
  return 0.24
}

export type StartSitMode = 'balanced' | 'safe' | 'upside'

export type StartSitPlayerRow = {
  playerId: string
  recordId: string | null
  name: string
  position: string
  team: string
  projectedPoints: number | null
  floor: number | null
  ceiling: number | null
  recentFantasyAvg: number | null
  injuryStatus: string | null
  rollingFppg: number | null
  headshotUrl: string | null
}

export type StartSitRec = {
  player: StartSitPlayerRow
  reason: string
  confidence: number
}

export type StartSitAnalyzeResult = {
  ok: true
  sport: SupportedSport
  leagueId: string
  leagueName: string
  week: number
  weekLabel: string
  generalAnalysis: boolean
  mode: StartSitMode
  leagueSettingsSnapshot: Record<string, unknown> | null
  teamContext: {
    teamName: string | null
    record: string | null
    rank: number | null
    pointsFor: number | null
  }
  opponent: { name: string | null; notes: string[] } | null
  recommendations: {
    bestStart: StartSitRec | null
    bestSit: StartSitRec | null
    safest: StartSitRec | null
    upside: StartSitRec | null
    floorOption: StartSitRec | null
  }
  matchupNotes: string[]
  injuryNewsNotes: string[]
  reasoning: { league: string; team: string }
  confidenceScore: number
  players: StartSitPlayerRow[]
  dataGaps: string[]
  dataFreshness: string
  chimmyPayload: Record<string, unknown>
}

export type StartSitAnalyzeError = { ok: false; error: string; code?: string }

async function resolveRecord(sport: string, rawId: string): Promise<SportsPlayerRecord | null> {
  const direct = await prisma.sportsPlayerRecord.findUnique({ where: { id: rawId } })
  if (direct) return direct
  const sp = await prisma.sportsPlayer.findFirst({
    where: { sport, OR: [{ externalId: rawId }, { sleeperId: rawId }, { id: rawId }] },
    select: { name: true },
  })
  if (!sp) return null
  return prisma.sportsPlayerRecord.findFirst({
    where: { sport, name: { equals: sp.name, mode: 'insensitive' } },
  })
}

async function nflWeekFromSleeper(): Promise<number> {
  try {
    const st = await fetch(`${SLEEPER}/state/nfl`, { next: { revalidate: 60 } })
    if (st.ok) {
      const j = (await st.json()) as { week?: number }
      if (typeof j.week === 'number' && j.week > 0) return j.week
    }
  } catch {
    /* default */
  }
  return 1
}

function resolveWeekParam(week: string, nflCurrent: number): number {
  if (week === 'current') return nflCurrent
  if (week === 'next') return Math.min(18, nflCurrent + 1)
  const n = Number(week)
  if (Number.isFinite(n) && n >= 1 && n <= 18) return n
  return nflCurrent
}

type SleeperMatchup = { roster_id?: number; matchup_id?: number; points?: number }

async function fetchSleeperOpponentNotes(
  platformLeagueId: string,
  week: number,
  ownerSleeperId: string,
): Promise<{ opponentName: string | null; notes: string[] }> {
  const notes: string[] = []
  try {
    const [rostersRes, matchRes, usersRes] = await Promise.all([
      fetch(`${SLEEPER}/league/${encodeURIComponent(platformLeagueId)}/rosters`, { next: { revalidate: 30 } }),
      fetch(`${SLEEPER}/league/${encodeURIComponent(platformLeagueId)}/matchups/${week}`, { next: { revalidate: 30 } }),
      fetch(`${SLEEPER}/league/${encodeURIComponent(platformLeagueId)}/users`, { next: { revalidate: 120 } }),
    ])
    const rosters = rostersRes.ok ? ((await rostersRes.json()) as { roster_id?: number; owner_id?: string }[]) : []
    const matchups = matchRes.ok ? ((await matchRes.json()) as SleeperMatchup[]) : []
    const users = usersRes.ok ? ((await usersRes.json()) as { user_id?: string; display_name?: string; metadata?: { team_name?: string } }[]) : []

    const mine = Array.isArray(rosters)
      ? rosters.find((r) => String(r.owner_id) === String(ownerSleeperId))
      : undefined
    const rid = mine?.roster_id
    if (rid == null) return { opponentName: null, notes }

    const row = Array.isArray(matchups) ? matchups.find((m) => m.roster_id === rid) : undefined
    const mid = row?.matchup_id
    if (mid == null) {
      notes.push('Matchup grouping not available from Sleeper for this week.')
      return { opponentName: null, notes }
    }
    const opp = Array.isArray(matchups) ? matchups.find((m) => m.roster_id !== rid && m.matchup_id === mid) : undefined
    const oppRoster = opp
      ? rosters.find((r) => r.roster_id === opp.roster_id)
      : undefined
    const oppOwner = oppRoster?.owner_id
    const u = Array.isArray(users) ? users.find((x) => String(x.user_id) === String(oppOwner)) : undefined
    const name =
      u?.metadata?.team_name?.trim() ||
      u?.display_name?.trim() ||
      (oppOwner ? `Opponent (${String(oppOwner).slice(0, 8)}…)` : null)

    if (typeof row?.points === 'number' && typeof opp?.points === 'number') {
      notes.push(`Your team: ${row.points.toFixed(1)} pts · Opponent: ${opp.points.toFixed(1)} pts (Sleeper week ${week}, if scored).`)
    } else {
      notes.push(`Sleeper week ${week} matchup id ${mid} — opponent roster ${opp?.roster_id ?? 'unknown'}.`)
    }

    return { opponentName: name, notes }
  } catch {
    notes.push('Could not load Sleeper matchup data.')
    return { opponentName: null, notes }
  }
}

function pickRec(p: StartSitPlayerRow, reason: string, confidence: number): StartSitRec {
  return { player: p, reason, confidence: Math.round(clamp(confidence, 0, 100)) }
}

export async function runStartSitAnalysis(input: {
  userId: string
  sportFilter: SupportedSport | 'ALL'
  leagueId: string | null
  week: string
  mode: StartSitMode
  teamExternalId: string | null
}): Promise<StartSitAnalyzeResult | StartSitAnalyzeError> {
  const dataGaps: string[] = []
  const now = new Date().toISOString()

  if (!input.leagueId) {
    return { ok: false, error: 'Select a league for roster-based Start/Sit analysis.', code: 'NO_LEAGUE' }
  }

  const access = await assertLeagueMember(input.leagueId, input.userId)
  if (!access.ok) {
    return { ok: false, error: 'League not found or access denied.', code: 'FORBIDDEN' }
  }

  const tradeLeague = await loadLeagueForTrade({ leagueId: input.leagueId, userId: input.userId })
  if (!tradeLeague) {
    return { ok: false, error: 'Could not load league.', code: 'NOT_FOUND' }
  }

  const sport = normalizeToSupportedSport(String(tradeLeague.sport))
  if (input.sportFilter !== 'ALL' && normalizeToSupportedSport(input.sportFilter) !== sport) {
    return { ok: false, error: 'Selected sport does not match this league.', code: 'SPORT_MISMATCH' }
  }

  const leagueSnapshot = snapshotFromLoaded(tradeLeague)
  const currentPeriod = sport === 'NFL' ? await nflWeekFromSleeper() : 1
  const weekNum = resolveWeekParam(input.week, currentPeriod)
  const weekLabel = sport === 'NFL' ? `NFL week ${weekNum}` : `${sport} period ${weekNum}`

  const leagueRow = await prisma.league.findFirst({
    where: { id: input.leagueId },
    select: { id: true, name: true, platform: true, platformLeagueId: true, settings: true, scoring: true },
  })

  let roster = await prisma.roster.findFirst({
    where: { leagueId: input.leagueId, platformUserId: input.userId },
    select: { playerData: true, platformUserId: true },
  })

  if (input.teamExternalId) {
    const lt = await prisma.leagueTeam.findFirst({
      where: { leagueId: input.leagueId, externalId: input.teamExternalId },
      select: { platformUserId: true },
    })
    if (lt?.platformUserId) {
      const r2 = await prisma.roster.findFirst({
        where: { leagueId: input.leagueId, platformUserId: lt.platformUserId },
        select: { playerData: true, platformUserId: true },
      })
      if (r2) roster = r2
    }
  }

  if (!roster) {
    return { ok: false, error: 'No roster found for this team in AllFantasy.', code: 'NO_ROSTER' }
  }

  const ids = getRosterPlayerIds(roster.playerData).slice(0, 60)
  if (ids.length === 0) {
    dataGaps.push('Roster has no player IDs synced yet.')
  }

  let leagueTeamSelf = await prisma.leagueTeam.findFirst({
    where: { leagueId: input.leagueId, claimedByUserId: input.userId },
    select: {
      teamName: true,
      wins: true,
      losses: true,
      ties: true,
      pointsFor: true,
      currentRank: true,
    },
  })
  if (input.teamExternalId) {
    const lt = await prisma.leagueTeam.findFirst({
      where: { leagueId: input.leagueId, externalId: input.teamExternalId },
      select: {
        teamName: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        currentRank: true,
      },
    })
    if (lt) leagueTeamSelf = lt
  }

  const players: StartSitPlayerRow[] = []
  for (const rawId of ids) {
    const row = await resolveRecord(sport, rawId)
    if (!row) {
      dataGaps.push(`No sports_players row for roster id ${String(rawId).slice(0, 10)}…`)
      continue
    }
    const pa = sportsRecordToPricedAsset(row)
    const vol = volFromInjury(row.injuryStatus)
    const proj = projFromProjections(row.projections)
    const baseProj = proj ?? (pa.assetValue.marketValue > 0 ? clamp(pa.assetValue.marketValue / 45, 0, 80) : null)
    const floor =
      baseProj != null ? roundToTenth(baseProj * (1 - 0.35 * vol)) : null
    const ceiling =
      baseProj != null ? roundToTenth(baseProj * (1 + 0.45 * vol)) : null

    players.push({
      playerId: rawId,
      recordId: row.id,
      name: row.name,
      position: row.position,
      team: row.team,
      projectedPoints: baseProj != null ? roundToTenth(baseProj) : null,
      floor,
      ceiling,
      recentFantasyAvg: recentFpgFromStats(row.stats),
      injuryStatus: row.injuryStatus,
      rollingFppg: null,
      headshotUrl: row.headshotUrlLg ?? row.headshotUrlSm ?? row.headshotUrl,
    })
  }

  if (players.length > 0) {
    try {
      const ri = await fetchRollingInsights(
        { prisma },
        { playerNames: players.slice(0, 22).map((p) => p.name), sport, includeStats: true },
      )
      const byName = new Map(ri.players.map((x) => [x.name.toLowerCase(), x]))
      for (const p of players) {
        const hit = byName.get(p.name.toLowerCase())
        if (hit?.fantasyPointsPerGame != null) p.rollingFppg = hit.fantasyPointsPerGame
      }
    } catch {
      dataGaps.push('Rolling Insights merge failed (non-fatal).')
    }
  }

  const injuryNewsNotes: string[] = []
  for (const p of players.slice(0, 8)) {
    if (!p.recordId) continue
    try {
      const news = await getPlayerNews(p.recordId, 2)
      for (const n of news) {
        const line = `${p.name}: ${n.headline}`.slice(0, 200)
        if (!injuryNewsNotes.includes(line)) injuryNewsNotes.push(line)
      }
    } catch {
      /* skip */
    }
  }

  const withProj = players.filter((p): p is StartSitPlayerRow & { projectedPoints: number } => p.projectedPoints != null)
  const sortable = [...withProj].sort((a, b) => b.projectedPoints - a.projectedPoints)
  const byFloor = [...players].filter((p) => p.floor != null).sort((a, b) => (b.floor ?? 0) - (a.floor ?? 0))
  const byCeil = [...players].filter((p) => p.ceiling != null).sort((a, b) => (b.ceiling ?? 0) - (a.ceiling ?? 0))

  const bestStart = sortable[0]
    ? pickRec(
        sortable[0],
        'Highest projected points on your roster for this period (from DB projections / valuation).',
        72 + Math.min(20, sortable.length),
      )
    : null
  const worst = sortable.length >= 2 ? sortable[sortable.length - 1] : null
  const bestSit = worst
    ? pickRec(
        worst,
        'Lowest projected among players with projections on this roster — lean sit if you have alternatives.',
        55,
      )
    : null

  const safest = byFloor[0]
    ? pickRec(byFloor[0], 'Highest modeled floor using injury volatility around projections.', 68)
    : null
  const upside = byCeil[0]
    ? pickRec(byCeil[0], 'Highest modeled ceiling — swing profile for the week.', 62)
    : null

  let primaryStart: StartSitRec | null = bestStart
  if (input.mode === 'safe' && safest) primaryStart = safest
  if (input.mode === 'upside' && upside) primaryStart = upside

  const recommendations = {
    bestStart: primaryStart,
    bestSit,
    safest,
    upside,
    floorOption: safest,
  }

  const matchupNotes: string[] = []
  let opponent: StartSitAnalyzeResult['opponent'] = null

  if (leagueRow?.platform === 'sleeper' && leagueRow.platformLeagueId && sport === 'NFL') {
    let owner =
      (await prisma.userProfile.findUnique({ where: { userId: input.userId }, select: { sleeperUserId: true } }))
        ?.sleeperUserId?.trim() || input.userId
    if (input.teamExternalId) {
      const lt = await prisma.leagueTeam.findFirst({
        where: { leagueId: input.leagueId, externalId: input.teamExternalId },
        select: { platformUserId: true },
      })
      if (lt?.platformUserId) owner = lt.platformUserId
    }
    const o = await fetchSleeperOpponentNotes(leagueRow.platformLeagueId, weekNum, owner)
    opponent = { name: o.opponentName, notes: o.notes }
    matchupNotes.push(...o.notes)
  } else {
    matchupNotes.push('Opponent detail uses Sleeper NFL sync when league platform is Sleeper.')
    dataGaps.push('Non-Sleeper or non-NFL: matchup API not wired in this path.')
  }

  for (const p of players) {
    if (p.injuryStatus && /out|ir|doubt|quest/i.test(p.injuryStatus)) {
      injuryNewsNotes.unshift(`${p.name}: ${p.injuryStatus}`)
    }
  }

  const projCoverage = withProj.length / Math.max(1, players.length)
  const confidenceScore = Math.round(
    clamp(40 + projCoverage * 45 + (players.length > 5 ? 10 : 0) - dataGaps.length * 3, 15, 95),
  )

  const recordStr =
    leagueTeamSelf != null
      ? `${leagueTeamSelf.wins}-${leagueTeamSelf.losses}${leagueTeamSelf.ties ? `-${leagueTeamSelf.ties}` : ''}`
      : null

  const reasoning = {
    league: `Format: ${leagueSnapshot.quickModeBadges.join(', ') || 'standard'}. Scoring: ${tradeLeague.scoring ?? 'see league settings'}.`,
    team: leagueTeamSelf
      ? `${leagueTeamSelf.teamName ?? 'Your team'} — ${recordStr ?? 'record n/a'} · PF ${leagueTeamSelf.pointsFor?.toFixed(1) ?? '—'} · Rank ${leagueTeamSelf.currentRank ?? '—'}.`
      : 'Link your team in this league for full standings context.',
  }

  const leagueSettingsSnapshot: Record<string, unknown> = {
    leagueId: tradeLeague.id,
    leagueName: tradeLeague.name,
    sport: tradeLeague.sport,
    quickModeBadges: leagueSnapshot.quickModeBadges,
    leagueSize: tradeLeague.leagueSize,
    isDynasty: tradeLeague.isDynasty,
    isSuperFlex: leagueSnapshot.isSuperFlexHint,
    tePremium: leagueSnapshot.tePremiumHint,
    scoring: tradeLeague.scoring,
    settings: tradeLeague.settings,
    week: weekNum,
    weekLabel,
  }

  const chimmyPayload = {
    tool: 'start_sit',
    sport,
    leagueId: input.leagueId,
    leagueName: tradeLeague.name,
    week: weekNum,
    mode: input.mode,
    leagueSettingsSnapshot,
    teamContext: {
      teamName: leagueTeamSelf?.teamName,
      record: recordStr,
      rank: leagueTeamSelf?.currentRank,
      pointsFor: leagueTeamSelf?.pointsFor,
    },
    opponent,
    recommendations: {
      bestStart: recommendations.bestStart?.player.name,
      bestSit: recommendations.bestSit?.player.name,
      safest: recommendations.safest?.player.name,
      upside: recommendations.upside?.player.name,
      floorOption: recommendations.floorOption?.player.name,
    },
    players: players.slice(0, 30).map((p) => ({
      name: p.name,
      position: p.position,
      proj: p.projectedPoints,
      floor: p.floor,
      ceiling: p.ceiling,
      injury: p.injuryStatus,
      rollingFppg: p.rollingFppg,
    })),
    matchupNotes,
    injuryNewsNotes: injuryNewsNotes.slice(0, 12),
    dataGaps,
    dataFreshness: now,
  }

  return {
    ok: true,
    sport,
    leagueId: input.leagueId,
    leagueName: tradeLeague.name ?? 'League',
    week: weekNum,
    weekLabel,
    generalAnalysis: false,
    mode: input.mode,
    leagueSettingsSnapshot,
    teamContext: {
      teamName: leagueTeamSelf?.teamName ?? null,
      record: recordStr,
      rank: leagueTeamSelf?.currentRank ?? null,
      pointsFor: leagueTeamSelf?.pointsFor ?? null,
    },
    opponent,
    recommendations: {
      bestStart: recommendations.bestStart,
      bestSit: recommendations.bestSit,
      safest: recommendations.safest,
      upside: recommendations.upside,
      floorOption: recommendations.floorOption,
    },
    matchupNotes,
    injuryNewsNotes: injuryNewsNotes.slice(0, 15),
    reasoning,
    confidenceScore,
    players,
    dataGaps,
    dataFreshness: now,
    chimmyPayload,
  }
}

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10
}
