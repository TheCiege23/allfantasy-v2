/**
 * Cross-League Player Intelligence phase — Parts 2-9, the canonical
 * "My Players" service.
 *
 * Deliberately NOT a fresh roster-reading path. This phase's Part 1
 * inventory found `lib/shared-services/game-day/UserPlayerExposureService.ts`
 * (Fantasy OS Migration Plan, Phase 9) — a real, complete, SHADOW-MODE-ONLY
 * cross-league exposure engine with zero live consumers (confirmed by grep:
 * only its own module and a doc file reference it). Its own `UserPlayerExposure`
 * type already stubs `injuryStatus`/`gameWindow`/`leaguesRequiringAttention`
 * to `null`/`[]`, anticipating exactly this phase's enrichment. This module
 * gives it its first real consumer rather than re-deriving cross-league
 * roster aggregation from scratch — reusing its two real sub-primitives
 * directly: `resolveLinkedPlatformUserIds` (now exported for this reason)
 * and `getNormalizedLineupSections` (`lib/roster/LineupTemplateValidation.ts`,
 * Waiver OS Phase 7's battle-tested dual-shape parser — handles both the
 * `lineup_sections`-normalized shape and Sleeper's flat `players`/`starters`/
 * `taxi`/`reserve` array shape, a real gap Phase 33 found and fixed).
 *
 * This module DOES compute one genuinely new thing
 * `UserPlayerExposureService.ts` does not: canonical, cross-PROVIDER
 * identity. That service aggregates by raw provider player id — the same
 * real player rostered via Sleeper in one league and ESPN in another
 * appears as two separate entries there. This module resolves every roster
 * player through `lib/shared-services/player-identity/`'s real
 * `resolvePlayers()` (Phase 14) and aggregates by `canonicalPlayerId`
 * instead — the one piece of real, additive work this phase does at the
 * identity layer. Never merges by display name alone; an ambiguous or
 * unresolved match stays keyed by its own provider-scoped fallback id
 * rather than being silently merged into another player's row.
 *
 * Injury and schedule/bye enrichment reuse the real, already-solved
 * Decision OS F2.2/F2.3 read-only world layers (`resolveScheduleContext`,
 * `resolveInjuryContext`) rather than the raw `InjuryReportRecord.playerId`
 * join `userOsContext.ts` uses — that join keys on an API-Sports id space
 * documented (`ADR_F2_3_INJURY_STATUS.md`) to NOT match roster player ids;
 * the Decision OS layer already exists specifically to route around that
 * mismatch via `SportsPlayer.status`, keyed by either `externalId` or
 * `sleeperId`.
 */
import { prisma } from '@/lib/prisma'
import { resolveLinkedPlatformUserIds, type ComputeUserPlayerExposureResult } from '../game-day/UserPlayerExposureService'
import { getNormalizedLineupSections, type RosterSectionKey } from '@/lib/roster/LineupTemplateValidation'
import { resolvePlayers } from '@/lib/shared-services/player-identity'
import type { ProviderPlayerRef, ResolutionConfidence } from '@/lib/shared-services/player-identity'
import { resolveInjuryContext, type InjuryContext } from '@/lib/decision-os/world/injuryEnrichedWorld'
import { resolveScheduleContext } from '@/lib/decision-os/world/scheduleBye'
import { assembleUserOsRecommendations } from './userOsRecommendations'
import { getPlayerImage } from '@/lib/players/getPlayerImage'
import type { LeagueHubProvider, LeagueRecommendation, SyncFreshness } from './types'
import { deriveSyncFreshness } from './syncFreshness'
import {
  resolveLeagueWaiverWorldStates,
  type LeagueWaiverWorldState,
  type UserRosterWaiverInfo,
} from './waiverWorldState'

/** The only sport this phase computes real injury/schedule/bye signals for — see `CROSS_LEAGUE_PLAYER_SUPPORT_MATRIX.md`. Every other sport still gets real roster/exposure aggregation, just no schedule/bye. */
const SCHEDULE_SUPPORTED_SPORTS = new Set(['NFL'])

export type RosterStatus = 'starter' | 'bench' | 'ir' | 'taxi' | 'reserve' | 'minor' | 'inactive' | 'unknown'

const SECTION_TO_ROSTER_STATUS: Record<RosterSectionKey, RosterStatus> = {
  starters: 'starter',
  bench: 'bench',
  ir: 'ir',
  taxi: 'taxi',
  devy: 'minor',
}

export type IdentityConfidence = 'verified' | 'mapped' | 'ambiguous' | 'unresolved'

/** `ResolutionConfidence` (player-identity's real, computed tiers) mapped onto this phase's requested vocabulary — never a second confidence model. */
const RESOLUTION_TO_IDENTITY_CONFIDENCE: Record<ResolutionConfidence, IdentityConfidence> = {
  direct: 'verified',
  name_match_confident: 'mapped',
  name_match_ambiguous: 'ambiguous',
  unresolved: 'unresolved',
}

export type InjuryStatus = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'suspended' | 'day_to_day' | 'unknown'

/**
 * `deriveAvailabilityCategory`'s real 4-category output has no
 * `questionable`/`doubtful`/`out`/`ir`/`suspended`/`day_to_day` split (the
 * richer fields are honestly null at the source — see
 * `ADR_F2_3_INJURY_STATUS.md`). Mapping `uncertain`→`questionable` and
 * `unavailable`→`out` is the most defensible single choice without
 * fabricating a distinction the source data doesn't actually make —
 * disclosed here and in the freshness/support matrix docs, not hidden.
 */
const AVAILABILITY_TO_INJURY_STATUS: Record<string, InjuryStatus> = {
  available: 'healthy',
  uncertain: 'questionable',
  unavailable: 'out',
  unknown: 'unknown',
}

/**
 * Real defect found and fixed during Part 21 physical validation: mapping only via the collapsed
 * 4-category `availabilityCategory` made `'ir'`/`'suspended'`/`'doubtful'`/`'day_to_day'` permanently
 * unreachable even though `InjuryStatus` declares them — every real IR player surfaced as generic
 * `'out'`. The real, raw `SportsPlayer.status` string IS already distinguishable for these cases (the
 * same real tokens `injuryEnrichedWorld.ts`'s own `UNAVAILABLE_STATUSES` set already recognizes: 'ir',
 * 'sus'/'suspended', 'o'/'out') — this maps from that raw string first, falling back to the collapsed
 * category only when the raw token isn't one of the known ones.
 */
function toInjuryStatus(rawStatus: string | null, availabilityCategory: string): InjuryStatus {
  const key = (rawStatus ?? '').trim().toLowerCase()
  const RAW_STATUS_MAP: Record<string, InjuryStatus> = {
    ir: 'ir',
    o: 'out',
    out: 'out',
    sus: 'suspended',
    suspended: 'suspended',
    d: 'doubtful',
    doubtful: 'doubtful',
    q: 'questionable',
    questionable: 'questionable',
    dtd: 'day_to_day',
    day_to_day: 'day_to_day',
    'day-to-day': 'day_to_day',
    active: 'healthy',
    healthy: 'healthy',
    act: 'healthy',
  }
  return RAW_STATUS_MAP[key] ?? AVAILABILITY_TO_INJURY_STATUS[availabilityCategory] ?? 'unknown'
}

export interface FreshnessMetadata {
  state: 'fresh' | 'stale' | 'syncing' | 'failed' | 'never_synced' | 'not_applicable' | 'unknown'
  lastSyncedAt: string | null
}

function toFreshnessMetadata(sync: SyncFreshness): FreshnessMetadata {
  return { state: sync.state, lastSyncedAt: sync.lastSyncedAt }
}

const UNKNOWN_FRESHNESS: FreshnessMetadata = { state: 'unknown', lastSyncedAt: null }

export interface CrossLeaguePlayerAppearance {
  canonicalLeagueId: string
  leagueName: string
  provider: LeagueHubProvider
  sport: string
  season: number
  canonicalTeamId: string | null
  teamName: string | null
  rosterStatus: RosterStatus
  leagueFormat: string | null
  record: string | null
  standing: number | null
  recommendation: LeagueRecommendation | null
  executionCapability: 'native_execute' | 'open_provider' | 'copy_action' | 'recommendation_only'
  syncFreshness: FreshnessMetadata
}

export interface CrossLeaguePlayerPortfolioItem {
  canonicalPlayerId: string
  displayName: string
  sport: string
  position: string | null
  professionalTeam: string | null
  identityConfidence: IdentityConfidence
  /** Real, resolved via the same UI-facing resolver every other roster surface uses (`lib/players/getPlayerImage.ts`) — never fetched, `null` triggers the existing letter/initial fallback, never blocks the portfolio. */
  headshotUrl: string | null

  injury: {
    status: InjuryStatus
    freshness: FreshnessMetadata
  } | null

  schedule: {
    byeWeek: number | null
    nextOpponent: string | null
    nextGameAt: string | null
    freshness: FreshnessMetadata
  } | null

  /**
   * Slice 4 — the latest REAL weekly projection available for this player
   * (FantasyProjection, same table the war-room contexts read). "Latest" =
   * highest week, then most recently fetched, for the player's season(s).
   * Null when no real projection row exists — never invented.
   */
  projection: {
    projectedPoints: number
    week: number
    season: string
    source: string
    fetchedAt: string
  } | null

  exposure: {
    leagueCount: number
    rosterCount: number
    starterCount: number
    benchCount: number
    injuredReserveCount: number
    taxiCount: number
    percentageOfUserLeagues: number
  }

  leagueAppearances: CrossLeaguePlayerAppearance[]

  actionSummary: {
    criticalCount: number
    highCount: number
    topAction: LeagueRecommendation | null
  }
}

export interface CrossLeaguePlayerPortfolioResult {
  items: CrossLeaguePlayerPortfolioItem[]
  connectedLeagueCount: number
  unsupportedSports: string[]
  /**
   * Slice 4 — per-league waiver world state (waiver type, FAAB, priority,
   * last/next run, the user's pending claims). League-level, so it lives on
   * the result rather than being duplicated into every player's appearances.
   */
  waiverWorldByLeague: Record<string, LeagueWaiverWorldState>
}

interface RawRosterRow {
  playerId: string
  name: string | null
  position: string | null
  team: string | null
  /** Raw `imageUrl` field, when the provider's own player row carries one — never fetched, only passed through. */
  imageUrl: string | null
  rosterStatus: RosterStatus
  canonicalLeagueId: string
  leagueName: string
  provider: LeagueHubProvider
  sport: string
  season: number
}

function toProvider(platform: string | null | undefined): LeagueHubProvider {
  const p = String(platform ?? '').toLowerCase()
  if (p === '' || p === 'allfantasy' || p === 'af' || p === 'manual' || p === 'native') return 'allfantasy'
  return p
}

function extractRosterRows(
  playerData: unknown,
  league: { id: string; name: string | null; platform: string; sport: string; season: number }
): RawRosterRow[] {
  const sections = getNormalizedLineupSections(playerData)
  const rows: RawRosterRow[] = []
  for (const [sectionKey, players] of Object.entries(sections) as Array<[RosterSectionKey, Array<Record<string, unknown>>]>) {
    for (const p of players) {
      const playerId = typeof p.id === 'string' ? p.id : ''
      if (!playerId) continue
      rows.push({
        playerId,
        name: typeof p.name === 'string' ? p.name : null,
        position: typeof p.position === 'string' ? p.position : null,
        team: typeof p.team === 'string' ? p.team : null,
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : null,
        rosterStatus: SECTION_TO_ROSTER_STATUS[sectionKey],
        canonicalLeagueId: league.id,
        leagueName: league.name ?? 'Unnamed League',
        provider: toProvider(league.platform),
        sport: league.sport,
        season: league.season,
      })
    }
  }
  return rows
}

/**
 * Resolves the full cross-league player portfolio for one authenticated
 * user. Every league membership and roster row is derived server-side from
 * `appUserId` — no client-supplied user, team, roster, or league ownership
 * is ever trusted (Part 2's explicit requirement).
 */
export async function assembleCrossLeaguePlayerPortfolio(args: {
  appUserId: string
  sport?: string
  provider?: LeagueHubProvider
  season?: number
  requestTime?: Date
}): Promise<CrossLeaguePlayerPortfolioResult> {
  const platformUserIds = await resolveLinkedPlatformUserIds(args.appUserId)
  if (platformUserIds.length === 0) {
    return { items: [], connectedLeagueCount: 0, unsupportedSports: [], waiverWorldByLeague: {} }
  }

  const rosters = await prisma.roster.findMany({
    where: { platformUserId: { in: platformUserIds } },
    select: {
      id: true,
      leagueId: true,
      platformUserId: true,
      playerData: true,
      faabRemaining: true,
      waiverPriority: true,
      league: {
        select: { id: true, name: true, platform: true, sport: true, season: true, lastSyncedAt: true, syncStatus: true, scoring: true },
      },
    },
  })

  const connectedLeagueIds = new Set(rosters.map((r) => r.leagueId))
  if (connectedLeagueIds.size === 0) {
    return { items: [], connectedLeagueCount: 0, unsupportedSports: [], waiverWorldByLeague: {} }
  }

  const rosterLeagueIds = Array.from(connectedLeagueIds)
  const teams = await prisma.leagueTeam.findMany({
    where: {
      leagueId: { in: rosterLeagueIds },
      OR: [{ claimedByUserId: args.appUserId }, { platformUserId: { in: platformUserIds } }],
    },
    select: { id: true, leagueId: true, teamName: true, wins: true, losses: true, ties: true, currentRank: true },
  })
  const teamByLeagueId = new Map(teams.map((t) => [t.leagueId, t]))

  // Filter to requested sport/provider/season if given — server-side, applied after real membership resolution.
  const filteredRosters = rosters.filter((r) => {
    if (args.sport && r.league.sport !== args.sport) return false
    if (args.provider && toProvider(r.league.platform) !== args.provider) return false
    if (args.season && r.league.season !== args.season) return false
    return true
  })

  const allRows: RawRosterRow[] = []
  for (const roster of filteredRosters) {
    allRows.push(...extractRosterRows(roster.playerData, roster.league))
  }

  // Part 4 — canonical identity resolution. Groups every raw roster row by its resolved canonical
  // player id (falling back to a stable provider-scoped synthetic id when unresolved/ambiguous, never
  // silently merged into a different player's row).
  const refs: ProviderPlayerRef[] = allRows.map((row) => ({
    provider: row.provider as ProviderPlayerRef['provider'],
    sourceId: row.playerId,
    nameHint: row.name,
    positionHint: row.position,
    teamHint: row.team,
    sport: row.sport,
  }))
  const resolutions = refs.length > 0 ? await resolvePlayers(refs) : []

  interface Accum {
    canonicalPlayerId: string
    displayName: string
    sport: string
    position: string | null
    professionalTeam: string | null
    identityConfidence: IdentityConfidence
    rows: RawRosterRow[]
  }
  const byCanonicalId = new Map<string, Accum>()

  allRows.forEach((row, i) => {
    const resolution = resolutions[i]
    const canonicalPlayerId = resolution?.player?.canonicalPlayerId ?? `unresolved:${row.provider}:${row.playerId}`
    const existing = byCanonicalId.get(canonicalPlayerId)
    if (existing) {
      existing.rows.push(row)
      return
    }
    byCanonicalId.set(canonicalPlayerId, {
      canonicalPlayerId,
      displayName: resolution?.player?.canonicalName ?? row.name ?? 'Unknown Player',
      sport: resolution?.player?.sport ?? row.sport,
      position: resolution?.player?.position ?? row.position,
      professionalTeam: resolution?.player?.team ?? row.team,
      identityConfidence: RESOLUTION_TO_IDENTITY_CONFIDENCE[resolution?.confidence ?? 'unresolved'],
      rows: [row],
    })
  })

  // Part 6 — injury enrichment. Batched by sport, since resolveInjuryContext is sport-scoped.
  const idsBySport = new Map<string, Set<string>>()
  for (const acc of byCanonicalId.values()) {
    const set = idsBySport.get(acc.sport) ?? new Set<string>()
    for (const row of acc.rows) set.add(row.playerId)
    idsBySport.set(acc.sport, set)
  }
  const injuryBySport = new Map<string, Map<string, InjuryContext>>()
  for (const [sport, ids] of idsBySport) {
    const result = await resolveInjuryContext(sport, Array.from(ids)).catch(() => null)
    // `result.byId` already carries the real, already-derived `availabilityCategory` — reused as-is,
    // never re-derived a second time.
    injuryBySport.set(sport, result?.byId ?? new Map())
  }

  // Part 7 — schedule/bye enrichment. NFL-only this phase (see SCHEDULE_SUPPORTED_SPORTS).
  const teamsBySport = new Map<string, Set<string>>()
  for (const acc of byCanonicalId.values()) {
    if (!SCHEDULE_SUPPORTED_SPORTS.has(acc.sport) || !acc.professionalTeam) continue
    const set = teamsBySport.get(acc.sport) ?? new Set<string>()
    set.add(acc.professionalTeam)
    teamsBySport.set(acc.sport, set)
  }
  const scheduleBySport = new Map<string, Awaited<ReturnType<typeof resolveScheduleContext>>>()
  for (const [sport, teamSet] of teamsBySport) {
    const currentSeason = args.season ?? new Date().getFullYear()
    const result = await resolveScheduleContext({ sport, season: currentSeason, currentWeek: null, teams: Array.from(teamSet) }).catch(
      () => null
    )
    if (result) scheduleBySport.set(sport, result)
  }

  // Part 8 — league-specific recommendations, per distinct league this user has a roster in. Reuses
  // the real User OS coordinator per league (never a second recommendation engine), then filters each
  // league's bundle down to entries whose `playerIds` include this player.
  const recommendationsByLeagueId = new Map<string, LeagueRecommendation[]>()
  for (const leagueId of rosterLeagueIds) {
    const result = await assembleUserOsRecommendations({ appUserId: args.appUserId, canonicalLeagueId: leagueId }).catch(() => null)
    if (!result || result.accessDenied) continue
    const all = [
      ...result.bundle.lineup,
      ...result.bundle.waiver,
      ...result.bundle.trade,
      ...result.bundle.roster,
      ...result.bundle.playoff,
      ...result.bundle.strategy,
    ]
    recommendationsByLeagueId.set(leagueId, all)
  }

  // Slice 4 — per-league waiver world state, from the rosters already loaded.
  const userRosterByLeague = new Map<string, UserRosterWaiverInfo>()
  for (const roster of filteredRosters) {
    if (!userRosterByLeague.has(roster.leagueId)) {
      userRosterByLeague.set(roster.leagueId, {
        rosterId: roster.id,
        faabRemaining: roster.faabRemaining ?? null,
        waiverPriority: roster.waiverPriority ?? null,
      })
    }
  }
  const requestNow = args.requestTime ?? new Date()
  const waiverWorld = await resolveLeagueWaiverWorldStates({
    leagueIds: Array.from(userRosterByLeague.keys()),
    userRosterByLeague,
    now: requestNow,
  }).catch(() => new Map<string, LeagueWaiverWorldState>())

  // Slice 4 — latest real weekly projections (FantasyProjection), batched by
  // sport + the seasons actually present in the user's leagues. Best-effort.
  const projectionByPlayerId = new Map<
    string,
    { projectedPoints: number; week: number; season: string; source: string; fetchedAt: string }
  >()
  for (const [sport, ids] of idsBySport) {
    const seasons = Array.from(
      new Set(allRows.filter((r) => r.sport === sport).map((r) => String(r.season))),
    )
    if (ids.size === 0 || seasons.length === 0) continue
    const rows = await prisma.fantasyProjection
      .findMany({
        where: { sport, season: { in: seasons }, playerId: { in: Array.from(ids) } },
        orderBy: [{ week: 'desc' }, { fetchedAt: 'desc' }],
        select: { playerId: true, projectedPoints: true, week: true, season: true, source: true, fetchedAt: true },
      })
      .catch(() => [])
    for (const row of rows) {
      if (!projectionByPlayerId.has(row.playerId)) {
        projectionByPlayerId.set(row.playerId, {
          projectedPoints: row.projectedPoints,
          week: row.week,
          season: row.season,
          source: row.source,
          fetchedAt: row.fetchedAt.toISOString(),
        })
      }
    }
  }

  const unsupportedSportsSeen = new Set<string>()
  const items: CrossLeaguePlayerPortfolioItem[] = Array.from(byCanonicalId.values()).map((acc) => {
    const leagueIds = new Set(acc.rows.map((r) => r.canonicalLeagueId))
    let starterCount = 0
    let benchCount = 0
    let irCount = 0
    let taxiCount = 0

    const appearances: CrossLeaguePlayerAppearance[] = acc.rows.map((row) => {
      if (row.rosterStatus === 'starter') starterCount++
      else if (row.rosterStatus === 'bench') benchCount++
      else if (row.rosterStatus === 'ir') irCount++
      else if (row.rosterStatus === 'taxi') taxiCount++

      const roster = filteredRosters.find((r) => r.leagueId === row.canonicalLeagueId)
      const freshness = roster
        ? toFreshnessMetadata(deriveSyncFreshness({ provider: row.provider, syncStatus: roster.league.syncStatus, lastSyncedAt: roster.league.lastSyncedAt }))
        : UNKNOWN_FRESHNESS
      const team = teamByLeagueId.get(row.canonicalLeagueId)
      const leagueRecs = recommendationsByLeagueId.get(row.canonicalLeagueId) ?? []
      const playerRec = leagueRecs.find((r) => r.playerIds?.includes(row.playerId)) ?? null

      return {
        canonicalLeagueId: row.canonicalLeagueId,
        leagueName: row.leagueName,
        provider: row.provider,
        sport: row.sport,
        season: row.season,
        canonicalTeamId: team?.id ?? null,
        teamName: team?.teamName ?? null,
        rosterStatus: row.rosterStatus,
        leagueFormat: roster?.league.scoring ?? null,
        record: team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : null,
        standing: team?.currentRank ?? null,
        recommendation: playerRec,
        executionCapability: row.provider === 'allfantasy' ? 'native_execute' : playerRec?.executionCapability === 'copy_action' ? 'copy_action' : 'recommendation_only',
        syncFreshness: freshness,
      }
    })

    if (!SCHEDULE_SUPPORTED_SPORTS.has(acc.sport)) unsupportedSportsSeen.add(acc.sport)

    // A canonical player can appear under multiple raw provider ids (e.g. a Sleeper id in one league,
    // an ESPN id in another) — try each real row's id in order until one resolves, rather than only
    // ever checking the first row's id.
    const injuryLookup = injuryBySport.get(acc.sport)
    const injuryContext = injuryLookup ? acc.rows.map((r) => injuryLookup.get(r.playerId)).find((ctx): ctx is InjuryContext => Boolean(ctx?.resolved)) : undefined
    const scheduleResult = scheduleBySport.get(acc.sport)
    const teamSchedule = acc.professionalTeam ? scheduleResult?.byTeam.get(acc.professionalTeam) : undefined

    const allRecs = appearances.map((a) => a.recommendation).filter((r): r is LeagueRecommendation => r !== null)
    const criticalCount = allRecs.filter((r) => r.priority === 'critical').length
    const highCount = allRecs.filter((r) => r.priority === 'high').length
    const topAction = [...allRecs].sort((a, b) => (b.priority === a.priority ? 0 : b.priority === 'critical' ? 1 : -1))[0] ?? null

    // Part 15 — real headshot resolution via the same UI-facing resolver every other roster surface
    // uses. A missing image never blocks the portfolio — `null` triggers the existing letter/initial
    // fallback, same as everywhere else in the app.
    const imageSourceRow = acc.rows.find((r) => r.imageUrl) ?? acc.rows[0]
    const headshotUrl = imageSourceRow
      ? getPlayerImage({ id: imageSourceRow.playerId, name: acc.displayName, imageUrl: imageSourceRow.imageUrl }, acc.sport)
      : null

    // Slice 4 — same multi-provider-id lookup strategy as injury: try each
    // real row's provider id until one has a projection row.
    const projection = acc.rows.map((r) => projectionByPlayerId.get(r.playerId)).find(Boolean) ?? null

    return {
      canonicalPlayerId: acc.canonicalPlayerId,
      displayName: acc.displayName,
      sport: acc.sport,
      position: acc.position,
      professionalTeam: acc.professionalTeam,
      identityConfidence: acc.identityConfidence,
      headshotUrl,
      projection,
      injury: injuryContext
        ? {
            status: toInjuryStatus(injuryContext.status, injuryContext.availabilityCategory),
            freshness: {
              state: injuryContext.freshness.isStale ? 'stale' : injuryContext.freshness.isStale === false ? 'fresh' : 'unknown',
              lastSyncedAt: injuryContext.freshness.updatedAt,
            },
          }
        : null,
      schedule: teamSchedule
        ? {
            byeWeek: teamSchedule.byeWeek,
            nextOpponent: teamSchedule.opponent,
            nextGameAt: teamSchedule.kickoffTime,
            freshness: { state: teamSchedule.freshness.isStale ? 'stale' : 'fresh', lastSyncedAt: teamSchedule.freshness.updatedAt },
          }
        : null,
      exposure: {
        leagueCount: leagueIds.size,
        rosterCount: acc.rows.length,
        starterCount,
        benchCount,
        injuredReserveCount: irCount,
        taxiCount,
        percentageOfUserLeagues: connectedLeagueIds.size > 0 ? leagueIds.size / connectedLeagueIds.size : 0,
      },
      leagueAppearances: appearances,
      actionSummary: { criticalCount, highCount, topAction },
    }
  })

  return {
    items,
    connectedLeagueCount: connectedLeagueIds.size,
    unsupportedSports: Array.from(unsupportedSportsSeen),
    waiverWorldByLeague: Object.fromEntries(waiverWorld),
  }
}

export interface ChimmyCrossLeaguePlayerRef {
  canonicalPlayerId: string
  displayName: string
  leagueNames: string[]
}

export interface ChimmyInjuredPlayerRef extends ChimmyCrossLeaguePlayerRef {
  injuryStatus: InjuryStatus
}

export interface ChimmyByeWeekPlayerRef extends ChimmyCrossLeaguePlayerRef {
  byeWeek: number
}

export interface ChimmyExposedPlayerRef extends ChimmyCrossLeaguePlayerRef {
  percentageOfUserLeagues: number
  leagueCount: number
}

export interface ChimmyActionPlayerRef extends ChimmyCrossLeaguePlayerRef {
  criticalCount: number
  highCount: number
  topAction: LeagueRecommendation | null
}

export interface ChimmyCrossLeaguePlayerSummary {
  connectedLeagueCount: number
  injuredPlayers: ChimmyInjuredPlayerRef[]
  byeWeekPlayers: ChimmyByeWeekPlayerRef[]
  overexposedPlayers: ChimmyExposedPlayerRef[]
  playersNeedingAction: ChimmyActionPlayerRef[]
}

function toRef(item: CrossLeaguePlayerPortfolioItem): ChimmyCrossLeaguePlayerRef {
  return {
    canonicalPlayerId: item.canonicalPlayerId,
    displayName: item.displayName,
    leagueNames: item.leagueAppearances.map((a) => a.leagueName),
  }
}

const OVEREXPOSED_THRESHOLD = 0.5
const HIGH_INJURY_STATUSES: InjuryStatus[] = ['out', 'ir', 'suspended', 'doubtful', 'questionable']

/**
 * Part 19 — the focused seam Chimmy can consume to answer "Which injured
 * players do I roster?" / "Which players are on bye?" / "Am I overexposed
 * to this player?" / "What commissioner-adjacent action needs attention?".
 * Deliberately narrower than the full portfolio result — four short,
 * curated lists, never the entire item array. Derives every league
 * membership and roster row from the resolved `appUserId` the exact same
 * way the coordinator does (calls it directly) — a normal-manager or
 * cross-user caller structurally cannot see another user's data because
 * there is no id parameter here that could name one.
 */
export async function getChimmyCrossLeaguePlayerSummary(args: { appUserId: string }): Promise<ChimmyCrossLeaguePlayerSummary> {
  const result = await assembleCrossLeaguePlayerPortfolio({ appUserId: args.appUserId })

  const injuredPlayers: ChimmyInjuredPlayerRef[] = result.items
    .filter((i) => i.injury && HIGH_INJURY_STATUSES.includes(i.injury.status))
    .map((i) => ({ ...toRef(i), injuryStatus: i.injury!.status }))

  const byeWeekPlayers: ChimmyByeWeekPlayerRef[] = result.items
    .filter((i): i is CrossLeaguePlayerPortfolioItem & { schedule: { byeWeek: number } } => i.schedule?.byeWeek != null)
    .map((i) => ({ ...toRef(i), byeWeek: i.schedule.byeWeek }))

  const overexposedPlayers: ChimmyExposedPlayerRef[] = result.items
    .filter((i) => i.exposure.percentageOfUserLeagues >= OVEREXPOSED_THRESHOLD && i.exposure.leagueCount > 1)
    .map((i) => ({ ...toRef(i), percentageOfUserLeagues: i.exposure.percentageOfUserLeagues, leagueCount: i.exposure.leagueCount }))

  const playersNeedingAction: ChimmyActionPlayerRef[] = result.items
    .filter((i) => i.actionSummary.criticalCount > 0 || i.actionSummary.highCount > 0)
    .map((i) => ({
      ...toRef(i),
      criticalCount: i.actionSummary.criticalCount,
      highCount: i.actionSummary.highCount,
      topAction: i.actionSummary.topAction,
    }))

  return {
    connectedLeagueCount: result.connectedLeagueCount,
    injuredPlayers,
    byeWeekPlayers,
    overexposedPlayers,
    playersNeedingAction,
  }
}

/**
 * Part 19 — "Where do I have this player?" / "Where should I start this
 * player?". Never resolves `canonicalPlayerId` independently — only ever
 * searches within the caller's own, already-authorized portfolio (same
 * boundary as the player-detail API route). Returns `null` for a player the
 * caller doesn't roster anywhere, identical to a nonexistent id — never a
 * distinguishable "you don't have this player" response.
 */
export async function getChimmyPlayerLookup(args: {
  appUserId: string
  canonicalPlayerId: string
}): Promise<CrossLeaguePlayerPortfolioItem | null> {
  const result = await assembleCrossLeaguePlayerPortfolio({ appUserId: args.appUserId })
  return result.items.find((i) => i.canonicalPlayerId === args.canonicalPlayerId) ?? null
}

export type { ComputeUserPlayerExposureResult }
