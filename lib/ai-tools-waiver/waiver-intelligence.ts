import 'server-only'

import type { SportsPlayerRecord } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { getTrendingPlayers } from '@/lib/sleeper-client'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { fetchFantasyCalcValues, findPlayerByName, type FantasyCalcPlayer } from '@/lib/fantasycalc'
import { pricePlayer, compositeScore, type ValuationContext, type PricedAsset } from '@/lib/hybrid-valuation'
import { sportsRecordToPricedAsset } from '@/lib/trade-value-console/sports-db-valuation'
import { loadLeagueForTrade } from '@/lib/trade-value-console/league-loader'
import { snapshotFromLoaded } from '@/lib/trade-value-console/quick-badges'
import { fetchRollingInsights } from '@/lib/upstream-apis'
import { normalizeToSupportedSport, SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'

export type WaiverTeamContext = 'my_team' | 'specific_team' | 'league_wide' | 'neutral'
export type WaiverStrategy =
  | 'best_available'
  | 'win_now'
  | 'safe_floor'
  | 'upside'
  | 'rebuilder'
  | 'streamers'
  | 'stash'
  | 'injury_replacement'
  | 'prospect_build'
  | 'neutral'
export type WaiverTimeHorizon = 'this_week' | 'two_weeks' | 'month' | 'ros' | 'dynasty'

export type WaiverIntelPlayer = {
  sport: SupportedSport
  rank: number
  positionRank: number
  /** sports_players.id when resolved; use for player detail API. */
  recordId: string | null
  playerId: string
  name: string
  position: string
  team: string
  headshotUrl: string | null
  imageUrl: string | null
  waiverScore: number
  composite: number
  marketValue: number
  faabPct: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  tier: 'must_add' | 'strong_add' | 'stream' | 'stash' | 'deep' | 'watchlist'
  tag: string
  why: string
  shortTerm: boolean
  longTerm: boolean
  injuryStatus: string | null
  trendingAdds: number
  isRookie: boolean
  suggestedDrop: { name: string; playerId: string; reason: string } | null
  /** Rolling Insights season FPPG when matched in DB (priority enrichment). */
  rollingFppg: number | null
}

export type WaiverIntelSection = {
  sport: SupportedSport
  picks: WaiverIntelPlayer[]
  summary: WaiverIntelligenceResult['summary']
}

export type WaiverIntelligenceResult = {
  ok: true
  mode: 'league' | 'trending_watchlist'
  sport: SupportedSport
  leagueId: string | null
  leagueName: string | null
  generalAnalysis: boolean
  faabRemaining: number | null
  faabBudget: number
  waiverTypeLabel: string
  summary: {
    priorityAdds: number
    critical: number
    high: number
    medium: number
    faabAvgPct: number
  }
  picks: WaiverIntelPlayer[]
  /** When Sport = All and no league, grouped results. */
  sections: WaiverIntelSection[] | null
  suggestedDrops: Array<{ playerId: string; name: string; position: string; reason: string }>
  dataGaps: string[]
  dataFreshness: string
  chimmyPayload: Record<string, unknown>
  /** League scoring / format snapshot when a league is loaded (for AI + UI). */
  leagueSettingsSnapshot: Record<string, unknown> | null
}

export type WaiverIntelligenceError = { ok: false; error: string; code?: string }

function sleeperSportKey(sport: string): string {
  return sport.toLowerCase()
}

function isRookieHeuristic(sport: string, age: number | null): boolean {
  if (age == null) return false
  if (sport === 'NFL' || sport === 'NCAAF') return age <= 24
  if (sport === 'NBA' || sport === 'NCAAB') return age <= 22
  return age <= 23
}

function urgencyFromSignals(args: { trending: number; injuryBoost: boolean; needFit: number }): WaiverIntelPlayer['urgency'] {
  if (args.injuryBoost && args.trending >= 500) return 'critical'
  if (args.trending >= 2000 || args.needFit > 75) return 'high'
  if (args.trending >= 200 || args.needFit > 55) return 'medium'
  return 'low'
}

function tierFromScore(score: number, urgency: WaiverIntelPlayer['urgency']): WaiverIntelPlayer['tier'] {
  if (urgency === 'critical' || score >= 82) return 'must_add'
  if (score >= 68) return 'strong_add'
  if (score >= 52) return 'stream'
  if (score >= 38) return 'stash'
  if (score >= 25) return 'deep'
  return 'watchlist'
}

function faabPctFromScore(score: number, faabRemaining: number, budget: number): number {
  if (budget <= 0 || faabRemaining <= 0) return 0
  const base = Math.round(8 + (score / 100) * 32)
  const cap = Math.min(45, Math.round((faabRemaining / budget) * 100))
  return Math.min(base, Math.max(1, cap))
}

/** Map league `scoring` string to FantasyCalc PPR setting. */
function pprFromLeagueScoring(scoring: string | null | undefined): 0 | 0.5 | 1 {
  const s = (scoring ?? '').toLowerCase()
  if (s.includes('half') || s.includes('0.5')) return 0.5
  if (s.includes('standard') && !s.includes('half')) return 0
  if (s.includes('ppr') || s.includes('full')) return 1
  return 1
}

function applyTePremiumToPlayerValue(pa: PricedAsset, enabled: boolean): PricedAsset {
  if (!enabled) return pa
  if (pa.position?.toUpperCase() !== 'TE') return pa
  const mult = 1.15
  const boosted = Math.round(pa.value * mult)
  return {
    ...pa,
    value: boosted,
    assetValue: {
      ...pa.assetValue,
      marketValue: Math.round(pa.assetValue.marketValue * mult),
      impactValue: Math.round(pa.assetValue.impactValue * mult),
      vorpValue: Math.round(pa.assetValue.vorpValue * mult),
      volatility: pa.assetValue.volatility,
    },
  }
}

type NflValuationBundle = {
  ctx: ValuationContext
  fc: FantasyCalcPlayer[]
  tePremium: boolean
}

async function buildNflValuationBundle(opts: {
  leagueSize: number
  isDynasty: boolean
  isSuperFlex: boolean
  ppr: 0 | 0.5 | 1
  tePremium: boolean
}): Promise<NflValuationBundle> {
  const nTeams = Math.min(32, Math.max(4, opts.leagueSize))
  const fc = await fetchFantasyCalcValues({
    isDynasty: opts.isDynasty,
    numQbs: opts.isSuperFlex ? 2 : 1,
    numTeams: nTeams,
    ppr: opts.ppr,
  })
  const asOf = new Date().toISOString().slice(0, 10)
  const ctx: ValuationContext = {
    asOfDate: asOf,
    isSuperFlex: opts.isSuperFlex,
    fantasyCalcPlayers: fc,
    numTeams: nTeams,
  }
  return { ctx, fc, tePremium: opts.tePremium }
}

async function enrichPicksWithRollingInsights(
  picks: WaiverIntelPlayer[],
  sport: string,
  dataGaps: string[],
): Promise<void> {
  if (picks.length === 0) return
  const names = picks.slice(0, 22).map((p) => p.name)
  try {
    const ri = await fetchRollingInsights(
      { prisma },
      { playerNames: names, sport, includeStats: true, skipCache: false },
    )
    const byLower = new Map(ri.players.map((p) => [p.name.toLowerCase(), p]))
    for (const pick of picks) {
      const hit = byLower.get(pick.name.toLowerCase())
      if (!hit) continue
      pick.rollingFppg = hit.fantasyPointsPerGame ?? null
      if (hit.fantasyPointsPerGame != null) {
        pick.why = `${pick.why} · Rolling Insights FPPG ${hit.fantasyPointsPerGame.toFixed(1)}`
      }
    }
  } catch {
    dataGaps.push('Rolling Insights enrichment failed (non-fatal).')
  }
}

async function resolveSportsPlayerRecord(sport: string, rosterPlayerId: string): Promise<SportsPlayerRecord | null> {
  const direct = await prisma.sportsPlayerRecord.findUnique({ where: { id: rosterPlayerId } })
  if (direct) return direct
  const sp = await prisma.sportsPlayer.findFirst({
    where: {
      sport,
      OR: [{ externalId: rosterPlayerId }, { sleeperId: rosterPlayerId }, { id: rosterPlayerId }],
    },
  })
  if (!sp) return null
  return prisma.sportsPlayerRecord.findFirst({
    where: { sport, name: { equals: sp.name, mode: 'insensitive' } },
  })
}

async function resolveRecordForFreeAgent(sport: string, externalId: string): Promise<SportsPlayerRecord | null> {
  const byId = await prisma.sportsPlayerRecord.findUnique({ where: { id: externalId } })
  if (byId) return byId
  const sp = await prisma.sportsPlayer.findFirst({
    where: { sport, externalId },
    select: { name: true },
  })
  if (!sp) return null
  return prisma.sportsPlayerRecord.findFirst({
    where: { sport, name: { equals: sp.name, mode: 'insensitive' } },
  })
}

function assignPositionRanks(picks: WaiverIntelPlayer[]) {
  const byPos = new Map<string, WaiverIntelPlayer[]>()
  for (const p of picks) {
    const k = p.position || 'UNK'
    const arr = byPos.get(k) ?? []
    arr.push(p)
    byPos.set(k, arr)
  }
  for (const arr of byPos.values()) {
    arr.sort((a, b) => b.waiverScore - a.waiverScore)
    arr.forEach((p, i) => {
      p.positionRank = i + 1
    })
  }
}

type RunArgs = {
  userId: string
  sportStr: SupportedSport
  sportFilter: SupportedSport | 'ALL'
  leagueId: string | null
  position: string
  rookiesOnly: boolean
  strategy: WaiverStrategy
  teamContext: WaiverTeamContext
  timeHorizon: WaiverTimeHorizon
  dataGaps: string[]
  /** When true, skip league-specific pool (trending-only slice). */
  multiSportSlice?: boolean
}

async function runSingleSportAnalysis(args: RunArgs): Promise<{
  picks: WaiverIntelPlayer[]
  suggestedDrops: WaiverIntelligenceResult['suggestedDrops']
  leagueId: string | null
  leagueName: string | null
  generalAnalysis: boolean
  faabRemaining: number | null
  faabBudget: number
  waiverTypeLabel: string
  effectiveSport: SupportedSport
  leagueSettingsSnapshot: Record<string, unknown> | null
}> {
  const input = args
  const dataGaps = args.dataGaps
  const sportStr = args.sportStr

  const userLeagues = await prisma.league.findMany({
    where: {
      OR: [{ userId: args.userId }, { teams: { some: { claimedByUserId: args.userId } } }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      platform: true,
      platformLeagueId: true,
      settings: true,
      leagueSize: true,
      isDynasty: true,
      leagueVariant: true,
      scoring: true,
      starters: true,
    },
  })

  let selectedLeague = args.leagueId ? userLeagues.find((l) => l.id === args.leagueId) ?? null : null

  if (args.leagueId && !selectedLeague) {
    throw new Error('LEAGUE_NOT_FOUND')
  }

  if (args.leagueId) {
    const access = await assertLeagueMember(args.leagueId, args.userId)
    if (!access.ok) throw new Error('FORBIDDEN')
  }

  let tradeLeague: Awaited<ReturnType<typeof loadLeagueForTrade>> | null = null
  let leagueSnapshot: ReturnType<typeof snapshotFromLoaded> | null = null
  if (args.leagueId) {
    tradeLeague = await loadLeagueForTrade({ leagueId: args.leagueId, userId: args.userId })
    if (tradeLeague) leagueSnapshot = snapshotFromLoaded(tradeLeague)
  }

  let effectiveSport: SupportedSport = sportStr
  if (selectedLeague) {
    effectiveSport = normalizeToSupportedSport(String(selectedLeague.sport))
  }

  const generalAnalysis = !selectedLeague

  let rostered = new Set<string>()
  let userRosterIds: string[] = []
  let faabRemaining: number | null = null
  let faabBudget = 100
  let leagueName: string | null = selectedLeague?.name ?? null
  let waiverTypeLabel = 'FAAB'

  if (selectedLeague) {
    const rosters = await prisma.roster.findMany({
      where: { leagueId: selectedLeague.id },
      select: { playerData: true, platformUserId: true, faabRemaining: true },
    })
    for (const r of rosters) {
      getRosterPlayerIds(r.playerData).forEach((id) => rostered.add(id))
    }
    const mine = rosters.find((r) => r.platformUserId === args.userId)
    if (mine) {
      userRosterIds = getRosterPlayerIds(mine.playerData)
      if (typeof mine.faabRemaining === 'number') faabRemaining = mine.faabRemaining
    }
    const settings = selectedLeague.settings as Record<string, unknown> | null
    const wb =
      (typeof tradeLeague?.waiverBudget === 'number' && tradeLeague.waiverBudget > 0
        ? tradeLeague.waiverBudget
        : null) ??
      settings?.waiverBudget ??
      settings?.faabBudget
    if (typeof wb === 'number' && wb > 0) faabBudget = wb
    const wt = settings?.waiverType ?? settings?.waiver_type
    if (typeof wt === 'string')
      waiverTypeLabel = wt.toLowerCase().includes('rolling')
        ? 'Rolling priority'
        : wt.toLowerCase().includes('fcfs')
          ? 'FCFS'
          : 'FAAB'
  }

  type Cand = {
    externalId: string
    name: string
    position: string
    team: string
    trending: number
    source: 'trending' | 'pool'
  }

  const candidates: Cand[] = []
  const seen = new Set<string>()

  if (!generalAnalysis && selectedLeague) {
    const sk = sleeperSportKey(sportStr)
    try {
      const trending = await getTrendingPlayers(sk, 'add', 48, 60)
      for (const t of trending) {
        if (!t?.player_id || rostered.has(t.player_id)) continue
        const row = await prisma.sportsPlayer.findFirst({
          where: { sport: sportStr, externalId: t.player_id },
          select: { externalId: true, name: true, position: true, team: true, age: true, imageUrl: true },
        })
        if (!row) {
          dataGaps.push(`No SportsPlayer row for trending id ${String(t.player_id).slice(0, 8)}… (${sportStr})`)
          continue
        }
        if (seen.has(row.externalId)) continue
        seen.add(row.externalId)
        candidates.push({
          externalId: row.externalId,
          name: row.name,
          position: (row.position ?? '—').toUpperCase(),
          team: row.team ?? 'FA',
          trending: t.count ?? 0,
          source: 'trending',
        })
      }
    } catch {
      dataGaps.push(`Sleeper trending unavailable for ${sportStr}.`)
    }

    if (candidates.length < 12 && !args.multiSportSlice) {
      try {
        const pool = await getPlayerPoolForLeague(selectedLeague.id, selectedLeague.sport as LeagueSport, {
          limit: 120,
          position:
            args.position !== 'ALL' && args.position !== 'FLEX' && args.position !== 'UTIL'
              ? args.position
              : undefined,
        })
        for (const p of pool) {
          const pid = String(p.player_id ?? p.external_source_id ?? '')
          if (!pid || rostered.has(pid)) continue
          if (seen.has(pid)) continue
          const name = p.full_name?.trim()
          if (!name) continue
          seen.add(pid)
          candidates.push({
            externalId: pid,
            name,
            position: (p.position ?? '—').toUpperCase(),
            team: p.team_abbreviation ?? 'FA',
            trending: 0,
            source: 'pool',
          })
          if (candidates.length >= 45) break
        }
      } catch {
        dataGaps.push('Player pool resolver returned no additional free agents.')
      }
    }
  } else {
    try {
      const trending = await getTrendingPlayers(sleeperSportKey(sportStr), 'add', 48, args.multiSportSlice ? 25 : 80)
      for (const t of trending) {
        if (!t?.player_id) continue
        const row = await prisma.sportsPlayer.findFirst({
          where: { sport: sportStr, externalId: t.player_id },
          select: { externalId: true, name: true, position: true, team: true, age: true, imageUrl: true },
        })
        if (!row) continue
        if (seen.has(row.externalId)) continue
        seen.add(row.externalId)
        candidates.push({
          externalId: row.externalId,
          name: row.name,
          position: (row.position ?? '—').toUpperCase(),
          team: row.team ?? '—',
          trending: t.count ?? 0,
          source: 'trending',
        })
        if (candidates.length >= (args.multiSportSlice ? 12 : 25)) break
      }
    } catch {
      dataGaps.push(`Trending data unavailable for ${sportStr}.`)
    }
  }

  const injRows =
    SUPPORTED_SPORTS.includes(sportStr as (typeof SUPPORTED_SPORTS)[number])
      ? await prisma.injuryReportRecord.findMany({
          where: { sport: sportStr },
          orderBy: { reportDate: 'desc' },
          take: 80,
          select: { playerName: true, status: true },
        })
      : []

  const injuryByName = new Map<string, string>()
  for (const r of injRows) {
    injuryByName.set(r.playerName.toLowerCase(), r.status)
  }

  let nflBundle: NflValuationBundle | null = null
  if (sportStr === 'NFL') {
    try {
      const leagueSize = tradeLeague?.leagueSize ?? selectedLeague?.leagueSize ?? 12
      const isDyn = tradeLeague?.isDynasty ?? true
      const isSf = leagueSnapshot?.isSuperFlexHint ?? false
      const ppr = tradeLeague ? pprFromLeagueScoring(tradeLeague.scoring) : 1
      const tep = leagueSnapshot?.tePremiumHint ?? false
      nflBundle = await buildNflValuationBundle({
        leagueSize: typeof leagueSize === 'number' ? leagueSize : 12,
        isDynasty: isDyn,
        isSuperFlex: isSf,
        ppr,
        tePremium: tep,
      })
    } catch {
      dataGaps.push('FantasyCalc valuation context failed — using DB projections only.')
    }
  }

  type Scored = WaiverIntelPlayer & { _need: number }
  const scored: Scored[] = []

  for (const c of candidates) {
    if (args.rookiesOnly) {
      const sp = await prisma.sportsPlayer.findFirst({
        where: { sport: sportStr, externalId: c.externalId },
        select: { age: true },
      })
      if (!isRookieHeuristic(sportStr, sp?.age ?? null)) continue
    }

    const pos = c.position
    if (args.position !== 'ALL') {
      if (args.position === 'FLEX') {
        if (!['RB', 'WR', 'TE'].includes(pos)) continue
      } else if (pos !== args.position) continue
    }

    let composite = 40
    let marketValue = 1000
    let headshotUrl: string | null = null
    let imageUrl: string | null = null
    let injuryStatus: string | null = injuryByName.get(c.name.toLowerCase()) ?? null
    let recordId: string | null = null

    if (sportStr === 'NFL' && nflBundle) {
      const matched = findPlayerByName(nflBundle.fc, c.name)
      try {
        let priced = await pricePlayer(c.name, nflBundle.ctx)
        priced = applyTePremiumToPlayerValue(priced, nflBundle.tePremium)
        composite = compositeScore(priced.assetValue)
        marketValue = priced.assetValue.marketValue
        if (matched) headshotUrl = null
      } catch {
        dataGaps.push(`Could not price ${c.name} (NFL)`)
      }
      const nflRec = await resolveRecordForFreeAgent(sportStr, c.externalId)
      if (nflRec) recordId = nflRec.id
    } else {
      const row = await resolveRecordForFreeAgent(sportStr, c.externalId)
      if (row) {
        recordId = row.id
        const pa = sportsRecordToPricedAsset(row)
        composite = compositeScore(pa.assetValue)
        marketValue = pa.assetValue.marketValue
        headshotUrl = row.headshotUrlLg ?? row.headshotUrlSm ?? row.headshotUrl ?? null
        imageUrl = headshotUrl
        if (row.injuryStatus) injuryStatus = row.injuryStatus
      } else {
        const sp = await prisma.sportsPlayer.findFirst({
          where: { sport: sportStr, externalId: c.externalId },
          select: { imageUrl: true },
        })
        imageUrl = sp?.imageUrl ?? null
      }
    }

    const needFit =
      args.teamContext === 'my_team' && userRosterIds.length > 0
        ? Math.min(95, 45 + Math.floor(composite * 0.45))
        : 55

    const injuryBoost =
      Boolean(injuryStatus && /questionable|doubtful|out|ir|pup/i.test(injuryStatus)) && c.trending > 50

    const urgency = urgencyFromSignals({
      trending: c.trending,
      injuryBoost,
      needFit,
    })

    let waiverScore = composite * 0.55 + Math.min(40, Math.log10(10 + c.trending) * 8) + (injuryBoost ? 8 : 0)
    if (args.strategy === 'streamers' && ['QB', 'TE', 'DST', 'K', 'DEF', 'G'].includes(pos)) waiverScore += 6
    if (args.strategy === 'stash' && composite < 50) waiverScore += 5
    if (args.strategy === 'injury_replacement' && injuryBoost) waiverScore += 12
    if (args.strategy === 'win_now') waiverScore += composite > 55 ? 4 : 0
    if (args.strategy === 'safe_floor' && composite > 45 && composite < 70) waiverScore += 3
    if (args.strategy === 'upside' && composite < 55 && c.trending > 300) waiverScore += 5
    if (args.timeHorizon === 'dynasty' && composite > 60) waiverScore += 4

    waiverScore = Math.min(100, Math.round(waiverScore))

    const ageRow = await prisma.sportsPlayer.findFirst({
      where: { sport: sportStr, externalId: c.externalId },
      select: { age: true, imageUrl: true },
    })
    const isRk = isRookieHeuristic(sportStr, ageRow?.age ?? null)
    if (!imageUrl && ageRow?.imageUrl) imageUrl = ageRow.imageUrl

    const tier = tierFromScore(waiverScore, urgency)
    const faabPct = faabPctFromScore(waiverScore, faabRemaining ?? faabBudget, faabBudget)

    let tag = 'WAIVER TARGET'
    if (c.trending > 1000) tag = 'BREAKOUT'
    if (injuryBoost) tag = 'INJURY SIGNAL'
    if (args.strategy === 'streamers') tag = 'STREAMER'
    if (args.strategy === 'stash') tag = 'STASH'

    const whyParts = [
      c.trending > 0 ? `Sleeper trending add (+${c.trending.toLocaleString()})` : 'Free-agent pool candidate',
      injuryStatus ? `Injury report: ${injuryStatus}` : null,
      `Composite ${Math.round(composite)}/100 · Market ~${Math.round(marketValue)}`,
    ].filter(Boolean)

    scored.push({
      sport: effectiveSport,
      rank: 0,
      positionRank: 0,
      recordId,
      playerId: c.externalId,
      name: c.name,
      position: pos,
      team: c.team,
      headshotUrl,
      imageUrl,
      waiverScore,
      composite: Math.round(composite * 10) / 10,
      marketValue: Math.round(marketValue),
      faabPct,
      urgency,
      confidence: Math.min(95, 55 + Math.round(composite * 0.35)),
      tier,
      tag,
      why: whyParts.join(' · '),
      shortTerm: args.timeHorizon === 'this_week' || args.timeHorizon === 'two_weeks',
      longTerm: args.timeHorizon === 'dynasty' || args.timeHorizon === 'ros',
      injuryStatus,
      trendingAdds: c.trending,
      isRookie: isRk,
      suggestedDrop: null,
      rollingFppg: null,
      _need: needFit,
    })
  }

  scored.sort((a, b) => b.waiverScore - a.waiverScore)
  scored.forEach((p, i) => {
    p.rank = i + 1
  })

  let picks: WaiverIntelPlayer[] = scored.slice(0, args.multiSportSlice ? 8 : 40).map((p) => {
    const { _need: _n, ...rest } = p
    return rest
  })

  assignPositionRanks(picks)

  await enrichPicksWithRollingInsights(picks, sportStr, dataGaps)

  const suggestedDrops: WaiverIntelligenceResult['suggestedDrops'] = []
  if (selectedLeague && args.teamContext === 'my_team' && userRosterIds.length > 0) {
    const dropScores: Array<{ id: string; name: string; position: string; composite: number }> = []
    for (const id of userRosterIds.slice(0, 40)) {
      const row = await resolveSportsPlayerRecord(sportStr, id)
      if (!row) continue
      const pa = sportsRecordToPricedAsset(row)
      const comp = compositeScore(pa.assetValue)
      dropScores.push({
        id,
        name: row.name,
        position: row.position,
        composite: comp,
      })
    }
    dropScores.sort((a, b) => a.composite - b.composite)
    for (const d of dropScores.slice(0, 3)) {
      suggestedDrops.push({
        playerId: d.id,
        name: d.name,
        position: d.position,
        reason: `Lowest composite value on your roster snapshot (${Math.round(d.composite)}).`,
      })
    }
    const drop0 = suggestedDrops[0]
    if (drop0) {
      const sd = { name: drop0.name, playerId: drop0.playerId, reason: drop0.reason }
      picks = picks.map((p, i) => (i < 8 ? { ...p, suggestedDrop: sd } : p))
    }
  }

  const leagueSettingsSnapshot: Record<string, unknown> | null =
    tradeLeague && leagueSnapshot
      ? {
          leagueId: tradeLeague.id,
          leagueName: tradeLeague.name,
          sport: tradeLeague.sport,
          quickModeBadges: leagueSnapshot.quickModeBadges,
          leagueSize: tradeLeague.leagueSize,
          isDynasty: tradeLeague.isDynasty,
          isSuperFlex: leagueSnapshot.isSuperFlexHint,
          tePremium: leagueSnapshot.tePremiumHint,
          ppr: pprFromLeagueScoring(tradeLeague.scoring),
          scoring: tradeLeague.scoring,
          waiverBudget: tradeLeague.waiverBudget,
          waiverTypeLabel,
          faabRemaining,
          taxiSlots: tradeLeague.taxiSlots,
          leagueVariant: tradeLeague.leagueVariant,
          bestBallMode: tradeLeague.bestBallMode,
        }
      : null

  return {
    picks,
    suggestedDrops,
    leagueId: selectedLeague?.id ?? null,
    leagueName,
    generalAnalysis,
    faabRemaining,
    faabBudget,
    waiverTypeLabel,
    effectiveSport,
    leagueSettingsSnapshot,
  }
}

export async function runWaiverIntelligenceAnalysis(input: {
  userId: string
  sportFilter: SupportedSport | 'ALL'
  leagueId: string | null
  position: string
  rookiesOnly: boolean
  strategy: WaiverStrategy
  teamContext: WaiverTeamContext
  timeHorizon: WaiverTimeHorizon
}): Promise<WaiverIntelligenceResult | WaiverIntelligenceError> {
  const dataGaps: string[] = []
  const now = new Date().toISOString()

  if (!input.userId) {
    return { ok: false, error: 'Sign in required.', code: 'UNAUTHORIZED' }
  }

  const allModeNoLeague = input.sportFilter === 'ALL' && !input.leagueId

  if (allModeNoLeague) {
    const sections: WaiverIntelSection[] = []
    const merged: WaiverIntelPlayer[] = []

    for (const sp of SUPPORTED_SPORTS) {
      try {
        const part = await runSingleSportAnalysis({
          userId: input.userId,
          sportStr: sp,
          sportFilter: input.sportFilter,
          leagueId: null,
          position: input.position,
          rookiesOnly: input.rookiesOnly,
          strategy: input.strategy,
          teamContext: input.teamContext,
          timeHorizon: input.timeHorizon,
          dataGaps,
          multiSportSlice: true,
        })
        if (part.picks.length === 0) continue
        const summary = summarizePicks(part.picks)
        sections.push({ sport: sp, picks: part.picks, summary })
        for (const p of part.picks) merged.push({ ...p, sport: sp })
      } catch {
        dataGaps.push(`Analysis skipped for ${sp}.`)
      }
    }

    merged.sort((a, b) => b.waiverScore - a.waiverScore)
    merged.forEach((p, i) => {
      p.rank = i + 1
    })
    assignPositionRanks(merged)

    const chimmyPayload = {
      tool: 'waiver_intelligence',
      mode: 'all_sports_trending',
      leagueSettings: null as Record<string, unknown> | null,
      sections: sections.map((s) => ({
        sport: s.sport,
        top: s.picks.slice(0, 5).map((p) => ({
          name: p.name,
          waiverScore: p.waiverScore,
          why: p.why,
          rollingFppg: p.rollingFppg,
        })),
      })),
      dataGaps,
      dataFreshness: now,
    }

    const flatSummary = summarizePicks(merged.slice(0, 40))

    return {
      ok: true,
      mode: 'trending_watchlist',
      sport: (merged[0]?.sport ?? 'NFL') as SupportedSport,
      leagueId: null,
      leagueName: null,
      generalAnalysis: true,
      faabRemaining: null,
      faabBudget: 100,
      waiverTypeLabel: 'N/A (no league)',
      summary: flatSummary,
      picks: merged.slice(0, 40),
      sections,
      suggestedDrops: [],
      dataGaps,
      dataFreshness: now,
      chimmyPayload,
      leagueSettingsSnapshot: null,
    }
  }

  let sportStr: SupportedSport = 'NFL'
  if (input.leagueId) {
    const lg = await prisma.league.findFirst({
      where: { id: input.leagueId },
      select: { sport: true },
    })
    if (lg) sportStr = normalizeToSupportedSport(String(lg.sport))
  } else if (input.sportFilter !== 'ALL') {
    sportStr = normalizeToSupportedSport(input.sportFilter)
  } else {
    const userLeagues = await prisma.league.findMany({
      where: {
        OR: [{ userId: input.userId }, { teams: { some: { claimedByUserId: input.userId } } }],
      },
      take: 1,
      select: { sport: true },
    })
    if (userLeagues[0]) sportStr = normalizeToSupportedSport(String(userLeagues[0].sport))
  }

  try {
    const part = await runSingleSportAnalysis({
      userId: input.userId,
      sportStr,
      sportFilter: input.sportFilter,
      leagueId: input.leagueId,
      position: input.position,
      rookiesOnly: input.rookiesOnly,
      strategy: input.strategy,
      teamContext: input.teamContext,
      timeHorizon: input.timeHorizon,
      dataGaps,
    })

    const picks = part.picks
    const critical = picks.filter((p) => p.urgency === 'critical').length
    const high = picks.filter((p) => p.urgency === 'high').length
    const medium = picks.filter((p) => p.urgency === 'medium').length
    const faabAvgPct =
      picks.length > 0 ? Math.round(picks.reduce((s, p) => s + p.faabPct, 0) / picks.length) : 0

    const chimmyPayload = {
      tool: 'waiver_intelligence',
      sport: part.effectiveSport,
      leagueId: part.leagueId,
      leagueName: part.leagueName,
      generalAnalysis: part.generalAnalysis,
      teamContext: input.teamContext,
      strategy: input.strategy,
      timeHorizon: input.timeHorizon,
      rookiesOnly: input.rookiesOnly,
      faabRemaining: part.faabRemaining,
      faabBudget: part.faabBudget,
      waiverTypeLabel: part.waiverTypeLabel,
      leagueSettings: part.leagueSettingsSnapshot,
      picks: picks.slice(0, 20).map((p) => ({
        name: p.name,
        position: p.position,
        sport: p.sport,
        waiverScore: p.waiverScore,
        faabPct: p.faabPct,
        why: p.why,
        rollingFppg: p.rollingFppg,
      })),
      suggestedDrops: part.suggestedDrops,
      dataGaps,
      dataFreshness: now,
    }

    return {
      ok: true,
      mode: part.generalAnalysis ? 'trending_watchlist' : 'league',
      sport: part.effectiveSport,
      leagueId: part.leagueId,
      leagueName: part.leagueName,
      generalAnalysis: part.generalAnalysis,
      faabRemaining: part.faabRemaining,
      faabBudget: part.faabBudget,
      waiverTypeLabel: part.waiverTypeLabel,
      summary: {
        priorityAdds: picks.filter((p) => p.urgency === 'critical' || p.urgency === 'high').length,
        critical,
        high,
        medium,
        faabAvgPct,
      },
      picks,
      sections: null,
      suggestedDrops: part.suggestedDrops,
      dataGaps,
      dataFreshness: now,
      chimmyPayload,
      leagueSettingsSnapshot: part.leagueSettingsSnapshot,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'FORBIDDEN') return { ok: false, error: 'League not found or you do not have access.', code: 'FORBIDDEN' }
    if (msg === 'LEAGUE_NOT_FOUND') return { ok: false, error: 'League not found.', code: 'NOT_FOUND' }
    console.error('[waiver-intelligence]', e)
    return { ok: false, error: 'Waiver analysis failed.', code: 'INTERNAL' }
  }
}

function summarizePicks(picks: WaiverIntelPlayer[]): WaiverIntelligenceResult['summary'] {
  const critical = picks.filter((p) => p.urgency === 'critical').length
  const high = picks.filter((p) => p.urgency === 'high').length
  const medium = picks.filter((p) => p.urgency === 'medium').length
  const faabAvgPct =
    picks.length > 0 ? Math.round(picks.reduce((s, p) => s + p.faabPct, 0) / picks.length) : 0
  return {
    priorityAdds: picks.filter((p) => p.urgency === 'critical' || p.urgency === 'high').length,
    critical,
    high,
    medium,
    faabAvgPct,
  }
}
