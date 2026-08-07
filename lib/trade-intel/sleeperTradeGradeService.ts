import 'server-only'

import { prisma } from '@/lib/prisma'
import { getLeagueContext } from '@/lib/league-context/leagueContextService'
import {
  getSeasonStatsBoard,
  scoreStatLine,
  type SeasonStatsBoard,
} from '@/lib/sports-data/sleeperMarketService'

/**
 * sleeperTradeGradeService — retroactive + evolving trade grades over the
 * league's WHOLE life.
 *
 * Walks the full previous_league_id chain, collects every completed trade from
 * every season's transaction feed, and grades each side on COUNTED outcomes:
 *  - realized value = each asset's full-season points, scored with the league's
 *    REAL scoring settings (IDP stats included) for the trade season and every
 *    season after it,
 *  - traded draft picks resolve to the player actually taken with that pick
 *    (slot_to_roster mapping from that season's draft) and inherit that
 *    player's realized points from their draft season onward; unresolvable or
 *    future picks are labeled `pending`, never guessed,
 *  - injury impact = games missed (17-game proxy, stated as such),
 *  - playoffs = whether the acquiring roster made that season's bracket (fact,
 *    shown next to the points — causality is the reader's call),
 *  - the grade EVOLVES: an initial grade from the trade season alone, a current
 *    grade from cumulative value since, and a per-season net trail so you can
 *    see it get better/worse/tie for every manager involved.
 *
 * The letter scale is deterministic and shipped IN the payload (gradeScale) —
 * every letter can be recomputed from the numbers next to it. Current and
 * future seasons re-grade automatically on cache refresh: the current season is
 * graded partial (flagged), then locks when complete.
 */

const SLEEPER = 'https://api.sleeper.app/v1'
const CACHE_PREFIX = 'trade-grades:v1:'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_CHAIN = 12
const MAX_WEEKS = 18
const SEASON_GAMES = 17

async function j<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SLEEPER}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ── Wire types (consumed subset) ─────────────────────────────────────────────
type WireLeague = {
  league_id: string
  name: string
  season: string
  status: string
  previous_league_id?: string | null
}
type WireUser = {
  user_id: string
  display_name: string
  avatar: string | null
  metadata?: { team_name?: string | null } | null
}
type WireRoster = { roster_id: number; owner_id: string | null }
type WireBracketNode = { t1?: number | null; t2?: number | null }
type WireTransaction = {
  transaction_id: string
  type: string
  status: string
  leg: number
  created: number
  roster_ids?: number[] | null
  adds?: Record<string, number> | null
  drops?: Record<string, number> | null
  draft_picks?:
    | { season: string; round: number; roster_id: number; previous_owner_id: number; owner_id: number }[]
    | null
}
type WireDraft = {
  draft_id: string
  season: string
  status: string
  slot_to_roster_id?: Record<string, number> | null
}
type WireDraftPick = {
  round: number
  draft_slot: number
  player_id?: string | null
  metadata?: {
    first_name?: string | null
    last_name?: string | null
    position?: string | null
  } | null
}

// ── Payload types ────────────────────────────────────────────────────────────
export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F'

export type TradeAsset = {
  playerId: string
  name: string
  position: string | null
  /** League-scored full-season points, per graded season. */
  pointsBySeason: Record<string, number>
  /** Games missed that season (17-game proxy); null = stats not synced. */
  gamesMissedBySeason: Record<string, number | null>
}

export type TradePickAsset = {
  season: string
  round: number
  originalRosterId: number
  label: string
  resolved: {
    playerId: string
    name: string
    position: string | null
    pointsBySeason: Record<string, number>
  } | null
  pending: boolean
}

export type TradeSideGrade = {
  rosterId: number
  ownerId: string | null
  managerName: string
  teamName: string | null
  avatar: string | null
  playersIn: TradeAsset[]
  playersOut: TradeAsset[]
  picksIn: TradePickAsset[]
  picksOut: TradePickAsset[]
  /** Did this roster make the playoff bracket in the trade season (null = bracket not synced). */
  madePlayoffs: boolean | null
  /** Net realized points (in − out) per graded season, oldest → newest. */
  seasonNets: { season: string; net: number; partial: boolean }[]
  cumulativeNet: number
  initialGrade: GradeLetter
  currentGrade: GradeLetter
  trend: 'improving' | 'worsening' | 'steady'
}

export type GradedTrade = {
  id: string
  season: string
  week: number
  createdIso: string
  multiTeam: boolean
  tie: boolean
  sides: TradeSideGrade[]
  hasPendingPicks: boolean
}

export type TradeGradesPayload = {
  version: 1
  fetchedAt: string
  staleAsOf: string | null
  sleeperLeagueId: string
  seasonsScanned: string[]
  currentSeasonPartial: boolean
  gradeScale: {
    description: string
    thresholds: { letter: GradeLetter; minAvgNetPerSeason: number | null }[]
    tieBand: number
  }
  contextNotes: string[]
  trades: GradedTrade[]
  missing: string[]
}

// ── Grade math (deterministic, shipped with the payload) ─────────────────────
const TIE_BAND = 60

function letterFor(avgNetPerSeason: number): GradeLetter {
  if (avgNetPerSeason >= 100) return 'A'
  if (avgNetPerSeason >= 40) return 'B'
  if (avgNetPerSeason > -40) return 'C'
  if (avgNetPerSeason > -100) return 'D'
  return 'F'
}

// ── Chain + season data collection ───────────────────────────────────────────
type SeasonData = {
  leagueId: string
  season: string
  complete: boolean
  users: Map<string, WireUser>
  rosterOwner: Map<number, string | null>
  playoffRosters: Set<number> | null
  trades: WireTransaction[]
  draftPickResolver: ((round: number, originalRosterId: number) => WireDraftPick | null) | null
}

async function collectSeason(league: WireLeague, missing: string[]): Promise<SeasonData> {
  const id = league.league_id
  const weekFetches = Array.from({ length: MAX_WEEKS }, (_, i) =>
    j<WireTransaction[]>(`/league/${id}/transactions/${i + 1}`),
  )
  const [users, rosters, bracket, drafts, ...weeks] = await Promise.all([
    j<WireUser[]>(`/league/${id}/users`),
    j<WireRoster[]>(`/league/${id}/rosters`),
    j<WireBracketNode[]>(`/league/${id}/winners_bracket`),
    j<WireDraft[]>(`/league/${id}/drafts`),
    ...weekFetches,
  ])
  if (!users) missing.push(`${league.season}: managers`)
  if (!rosters) missing.push(`${league.season}: rosters`)

  const trades: WireTransaction[] = []
  let weeksMissing = 0
  weeks.forEach((w) => {
    if (!w) {
      weeksMissing += 1
      return
    }
    for (const t of w) {
      if (t.type === 'trade' && t.status === 'complete') trades.push(t)
    }
  })
  if (weeksMissing === MAX_WEEKS) missing.push(`${league.season}: transactions`)

  const playoffRosters = bracket
    ? new Set(
        bracket
          .flatMap((n) => [n.t1, n.t2])
          .filter((x): x is number => typeof x === 'number'),
      )
    : null

  // Draft pick resolver for THIS season's draft (used by trades from earlier
  // seasons whose traded picks land here).
  let draftPickResolver: SeasonData['draftPickResolver'] = null
  const draft = (drafts ?? []).find((d) => d.status === 'complete') ?? (drafts ?? [])[0] ?? null
  if (draft) {
    const picks = await j<WireDraftPick[]>(`/draft/${draft.draft_id}/picks`)
    const slotToRoster = draft.slot_to_roster_id ?? null
    if (picks && slotToRoster) {
      const rosterToSlot = new Map<number, number>()
      for (const [slot, rosterId] of Object.entries(slotToRoster)) {
        rosterToSlot.set(rosterId, Number(slot))
      }
      const bySlot = new Map<string, WireDraftPick>()
      for (const p of picks) bySlot.set(`${p.round}:${p.draft_slot}`, p)
      draftPickResolver = (round, originalRosterId) => {
        const slot = rosterToSlot.get(originalRosterId)
        if (slot == null) return null
        return bySlot.get(`${round}:${slot}`) ?? null
      }
    }
  }

  return {
    leagueId: id,
    season: league.season,
    complete: String(league.status).toLowerCase() === 'complete',
    users: new Map((users ?? []).map((u) => [u.user_id, u])),
    rosterOwner: new Map((rosters ?? []).map((r) => [r.roster_id, r.owner_id ?? null])),
    playoffRosters,
    trades,
    draftPickResolver,
  }
}

// ── Build ────────────────────────────────────────────────────────────────────
async function buildTradeGrades(
  sleeperLeagueId: string,
): Promise<TradeGradesPayload | null> {
  const missing: string[] = []
  const context = await getLeagueContext(sleeperLeagueId)
  if (!context) return null
  const scoring = context.scoring.settings
  const format = context.scoring.format

  // Walk the chain oldest → newest.
  const chain: WireLeague[] = []
  let cursor: string | null = sleeperLeagueId
  for (let i = 0; i < MAX_CHAIN && cursor; i += 1) {
    const league = await j<WireLeague>(`/league/${cursor}`)
    if (!league) {
      missing.push('part of the league chain (an older season did not load)')
      break
    }
    chain.unshift(league)
    cursor = league.previous_league_id ?? null
  }
  if (chain.length === 0) return null

  const seasons: SeasonData[] = []
  for (const league of chain) {
    seasons.push(await collectSeason(league, missing))
  }
  const seasonByYear = new Map(seasons.map((s) => [s.season, s]))
  const latest = seasons[seasons.length - 1]
  const currentSeasonPartial = !latest.complete

  // Stats boards for every season we will grade against.
  const statsBoards = new Map<string, SeasonStatsBoard>()
  for (const s of seasons) {
    const board = await getSeasonStatsBoard(s.season, s.complete)
    if (board) statsBoards.set(s.season, board)
    else missing.push(`${s.season}: season stats`)
  }

  const pointsFor = (playerId: string, season: string): number | null => {
    const row = statsBoards.get(season)?.players[playerId]
    if (!row) return null
    return Math.round(scoreStatLine(row.stats, scoring, format).points * 10) / 10
  }
  const gamesMissed = (playerId: string, season: string): number | null => {
    const row = statsBoards.get(season)?.players[playerId]
    const gp = row?.stats.gp
    if (typeof gp !== 'number') return null
    return Math.max(0, SEASON_GAMES - Math.round(gp))
  }
  const nameFor = (playerId: string): { name: string; position: string | null } => {
    for (const board of statsBoards.values()) {
      const row = board.players[playerId]
      if (row) return { name: row.name, position: row.position }
    }
    return { name: `Player ${playerId}`, position: null }
  }

  const trades: GradedTrade[] = []
  for (const seasonData of seasons) {
    const gradedSeasons = seasons
      .filter((s) => s.season >= seasonData.season)
      .map((s) => ({ season: s.season, partial: !s.complete }))

    for (const t of seasonData.trades) {
      const rosterIds = t.roster_ids ?? []
      if (rosterIds.length === 0) continue

      const assetFor = (playerId: string): TradeAsset => {
        const meta = nameFor(playerId)
        const pointsBySeason: Record<string, number> = {}
        const gamesMissedBySeason: Record<string, number | null> = {}
        for (const g of gradedSeasons) {
          const pts = pointsFor(playerId, g.season)
          if (pts != null) pointsBySeason[g.season] = pts
          gamesMissedBySeason[g.season] = gamesMissed(playerId, g.season)
        }
        return { playerId, ...meta, pointsBySeason, gamesMissedBySeason }
      }

      const pickAssetFor = (
        p: NonNullable<WireTransaction['draft_picks']>[number],
      ): TradePickAsset => {
        const label = `${p.season} round ${p.round}`
        const landing = seasonByYear.get(p.season)
        const resolvedPick = landing?.draftPickResolver?.(p.round, p.roster_id) ?? null
        if (!resolvedPick?.player_id) {
          return { season: p.season, round: p.round, originalRosterId: p.roster_id, label, resolved: null, pending: true }
        }
        const meta = nameFor(resolvedPick.player_id)
        const nameFromDraft =
          [resolvedPick.metadata?.first_name, resolvedPick.metadata?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || meta.name
        const pointsBySeason: Record<string, number> = {}
        for (const g of gradedSeasons) {
          if (g.season < p.season) continue
          const pts = pointsFor(resolvedPick.player_id, g.season)
          if (pts != null) pointsBySeason[g.season] = pts
        }
        return {
          season: p.season,
          round: p.round,
          originalRosterId: p.roster_id,
          label,
          resolved: {
            playerId: resolvedPick.player_id,
            name: nameFromDraft,
            position: resolvedPick.metadata?.position?.toUpperCase() ?? meta.position,
            pointsBySeason,
          },
          pending: false,
        }
      }

      const sides: TradeSideGrade[] = rosterIds.map((rosterId) => {
        const ownerId = seasonData.rosterOwner.get(rosterId) ?? null
        const user = ownerId ? seasonData.users.get(ownerId) : undefined
        const playersIn = Object.entries(t.adds ?? {})
          .filter(([, r]) => r === rosterId)
          .map(([pid]) => assetFor(pid))
        const playersOut = Object.entries(t.drops ?? {})
          .filter(([, r]) => r === rosterId)
          .map(([pid]) => assetFor(pid))
        const picksIn = (t.draft_picks ?? [])
          .filter((p) => p.owner_id === rosterId)
          .map(pickAssetFor)
        const picksOut = (t.draft_picks ?? [])
          .filter((p) => p.previous_owner_id === rosterId)
          .map(pickAssetFor)

        const seasonNets = gradedSeasons.map((g) => {
          const sum = (assets: TradeAsset[]) =>
            assets.reduce((acc, a) => acc + (a.pointsBySeason[g.season] ?? 0), 0)
          const sumPicks = (picks: TradePickAsset[]) =>
            picks.reduce((acc, p) => acc + (p.resolved?.pointsBySeason[g.season] ?? 0), 0)
          const net =
            sum(playersIn) + sumPicks(picksIn) - sum(playersOut) - sumPicks(picksOut)
          return { season: g.season, net: Math.round(net * 10) / 10, partial: g.partial }
        })
        const cumulativeNet =
          Math.round(seasonNets.reduce((acc, s) => acc + s.net, 0) * 10) / 10
        const initialGrade = letterFor(seasonNets[0]?.net ?? 0)
        const currentGrade = letterFor(cumulativeNet / Math.max(1, seasonNets.length))
        let trend: TradeSideGrade['trend'] = 'steady'
        if (seasonNets.length >= 2) {
          const last = seasonNets[seasonNets.length - 1].net
          const prev = seasonNets[seasonNets.length - 2].net
          if (last > prev + 15) trend = 'improving'
          else if (last < prev - 15) trend = 'worsening'
        }

        return {
          rosterId,
          ownerId,
          managerName: user?.display_name ?? 'Manager',
          teamName: user?.metadata?.team_name?.trim() || null,
          avatar: user?.avatar ?? null,
          playersIn,
          playersOut,
          picksIn,
          picksOut,
          madePlayoffs: seasonData.playoffRosters ? seasonData.playoffRosters.has(rosterId) : null,
          seasonNets,
          cumulativeNet,
          initialGrade,
          currentGrade,
          trend,
        }
      })

      const maxAbs = Math.max(...sides.map((s) => Math.abs(s.cumulativeNet)), 0)
      trades.push({
        id: `${seasonData.leagueId}:${t.transaction_id}`,
        season: seasonData.season,
        week: t.leg,
        createdIso: new Date(t.created).toISOString(),
        multiTeam: rosterIds.length > 2,
        tie: maxAbs <= TIE_BAND,
        sides,
        hasPendingPicks: sides.some((s) =>
          [...s.picksIn, ...s.picksOut].some((p) => p.pending),
        ),
      })
    }
  }
  trades.sort((a, b) => b.createdIso.localeCompare(a.createdIso))

  const contextNotes: string[] = [
    `Every point total is the asset's full-season score under this league's real scoring settings${context.variant.idp ? ' (IDP stats included)' : ''}.`,
    'Injury impact = games missed of a 17-game season (a counted proxy, not a medical report).',
    'Roster churn after the trade (later cuts/re-trades) is not yet netted out — grades track the acquired assets themselves.',
  ]
  if (context.houseRules.pirate?.active) {
    contextNotes.push(
      'Pirate rules declared: weekly floor and roster spread matter more here than raw season totals — read C-grade ties with that lens.',
    )
  }

  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    staleAsOf: null,
    sleeperLeagueId,
    seasonsScanned: seasons.map((s) => s.season),
    currentSeasonPartial,
    gradeScale: {
      description:
        'Average net realized points per graded season (points in − points out, incl. resolved picks). Recompute any letter from the numbers shown.',
      thresholds: [
        { letter: 'A', minAvgNetPerSeason: 100 },
        { letter: 'B', minAvgNetPerSeason: 40 },
        { letter: 'C', minAvgNetPerSeason: -40 },
        { letter: 'D', minAvgNetPerSeason: -100 },
        { letter: 'F', minAvgNetPerSeason: null },
      ],
      tieBand: TIE_BAND,
    },
    contextNotes,
    trades,
    missing,
  }
}

/** Cached accessor with stale-flagged fallback (same contract as league history). */
export async function getTradeGrades(
  sleeperLeagueId: string,
): Promise<TradeGradesPayload | null> {
  const cacheKey = `${CACHE_PREFIX}${sleeperLeagueId}`
  const now = new Date()
  const cached = await prisma.sportsDataCache.findUnique({ where: { cacheKey } }).catch(() => null)
  const cachedPayload =
    cached && cached.data && typeof cached.data === 'object'
      ? (cached.data as unknown as TradeGradesPayload)
      : null
  if (cachedPayload?.version === 1 && cached && cached.expiresAt > now) return cachedPayload

  const fresh = await buildTradeGrades(sleeperLeagueId).catch((err) => {
    console.error('[trade-grades] build failed', { sleeperLeagueId, err })
    return null
  })
  if (fresh) {
    await prisma.sportsDataCache
      .upsert({
        where: { cacheKey },
        update: { data: fresh as unknown as object, expiresAt: new Date(now.getTime() + CACHE_TTL_MS) },
        create: { cacheKey, data: fresh as unknown as object, expiresAt: new Date(now.getTime() + CACHE_TTL_MS) },
      })
      .catch((err) => console.error('[trade-grades] cache write failed', { sleeperLeagueId, err }))
    return fresh
  }
  if (cachedPayload?.version === 1 && cached) {
    return { ...cachedPayload, staleAsOf: cached.expiresAt.toISOString() }
  }
  return null
}
