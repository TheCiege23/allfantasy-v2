import 'server-only'

import { prisma } from '@/lib/prisma'
import { describeAge } from '@/lib/sports-data/freshnessPolicy'
import type { SectionState, UnavailableSection } from './leagueHome'

/**
 * Player Finder — "one name in, every platform, league, slot, injury and the
 * move to make".
 *
 * The cross-league part is the whole point of this screen, and it works like
 * this: `Roster.playerData` stores platform player ids in `players`, `starters`,
 * `reserve` and `taxi` arrays, and `SportsPlayer.sleeperId` bridges our player
 * rows to those ids. So a player is resolved to a sleeper id once, then every
 * roster in the user's leagues is filtered on it.
 *
 * Verified before building on it: Dalton Kincaid resolves to sleeperId 10236 and
 * appears on 42 rosters, 27 of them as a starter, with a positive control on a
 * second id. A JSON path filter that silently matched nothing would have made
 * this screen quietly claim the user owns no one.
 *
 * ⚠ The identity bridge is NOT complete. sleeperId is populated on roughly
 * 15k of 96k player rows, and PlayerIdentityMap holds under 2k entries — it
 * missed a player that SportsPlayer resolved. So `identityResolved: false` is a
 * real outcome and the screen says "we cannot cross-reference this player"
 * rather than "you do not own him".
 */

export type PlayerMatch = {
  externalId: string
  sleeperId: string | null
  name: string
  position: string | null
  team: string | null
  imageUrl: string | null
  number: number | null
  /** How many of the user's leagues roster him, when identity resolved. */
  rosteredIn: number | null
  platforms: string[]
}

export type LeagueSlot = {
  leagueId: string
  leagueName: string
  platform: string
  format: string | null
  /** STARTER / BENCH / IR / TAXI / NOT YOURS */
  slot: string
  isYours: boolean
}

export type PlayerDetail = {
  player: PlayerMatch
  identityResolved: boolean
  bio: { height: string | null; weight: string | null; age: number | null; college: string | null }
  injury: SectionState<{ status: string | null; description: string | null; reportedAt: Date | null }>
  seasonStats: SectionState<Array<{ season: string; stats: Record<string, string> }>>
  leagues: SectionState<LeagueSlot[]>
  projection: UnavailableSection
  snapShare: UnavailableSection
  positionRank: UnavailableSection
  recommendedMoves: UnavailableSection
  freshness: { label: string; stale: boolean }
}

const SLOT_ORDER = ['starters', 'reserve', 'taxi', 'players'] as const

/**
 * Positions arrive spelled differently per source — Sleeper says "TE", the
 * TheSportsDB ingest says "Tight End". Deduplicating on the raw string listed
 * Dalton Kincaid twice in the same result set, which reads as two players rather
 * than one player from two feeds.
 */
const POSITION_ALIASES: Record<string, string> = {
  quarterback: 'QB',
  'running back': 'RB',
  'wide receiver': 'WR',
  'tight end': 'TE',
  kicker: 'K',
  'place kicker': 'K',
  'defensive end': 'DE',
  'defensive tackle': 'DT',
  linebacker: 'LB',
  cornerback: 'CB',
  safety: 'S',
  'offensive tackle': 'OT',
  guard: 'G',
  center: 'C',
  'point guard': 'PG',
  'shooting guard': 'SG',
  'small forward': 'SF',
  'power forward': 'PF',
  goalkeeper: 'GK',
  midfielder: 'MF',
  defender: 'DF',
  forward: 'FW',
  pitcher: 'P',
  catcher: 'C',
}

function normalizePosition(raw: string | null): string {
  if (!raw) return ''
  const t = raw.trim().toLowerCase()
  return (POSITION_ALIASES[t] ?? raw.trim()).toUpperCase()
}

/** Team strings vary too ("BUF" vs "Buffalo Bills"); compare on the first token. */
function teamKey(raw: string | null): string {
  if (!raw) return ''
  const t = raw.trim().toUpperCase()
  return t.length <= 4 ? t : t.split(/\s+/).slice(-1)[0] ?? t
}

function slotLabel(key: (typeof SLOT_ORDER)[number]): string {
  if (key === 'starters') return 'STARTER'
  if (key === 'reserve') return 'IR SLOT'
  if (key === 'taxi') return 'TAXI'
  return 'BENCH'
}

export async function searchPlayers(query: string, limit = 12): Promise<PlayerMatch[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const rows = await prisma.sportsPlayer.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    // A player can exist under several sources; prefer rows that carry the
    // sleeper id, because those are the ones that can be cross-referenced.
    orderBy: [{ sleeperId: 'desc' }, { name: 'asc' }],
    take: limit * 3,
    select: {
      externalId: true, sleeperId: true, name: true, position: true,
      team: true, imageUrl: true, number: true, sport: true,
    },
  })

  // Collapse duplicates across sources, keeping the richest row per name+position.
  const seen = new Map<string, (typeof rows)[number]>()
  for (const r of rows) {
    // Normalised so "Dalton Kincaid / TE / BUF" and "Dalton Kincaid / Tight End
    // / BUF" collapse to one entry instead of looking like two players.
    const key = `${r.name.trim().toLowerCase()}|${normalizePosition(r.position)}|${teamKey(r.team)}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, r)
      continue
    }
    const better =
      (r.sleeperId ? 2 : 0) + (r.imageUrl ? 1 : 0) >
      (existing.sleeperId ? 2 : 0) + (existing.imageUrl ? 1 : 0)
    if (better) seen.set(key, r)
  }

  return [...seen.values()].slice(0, limit).map((r) => ({
    externalId: r.externalId,
    sleeperId: r.sleeperId,
    name: r.name,
    position: r.position,
    team: r.team,
    imageUrl: r.imageUrl,
    number: r.number,
    rosteredIn: null,
    platforms: [],
  }))
}

/**
 * Which of the user's leagues roster this player, and in which slot.
 *
 * Slot precedence matters: a player listed in both `players` and `starters` is a
 * STARTER, not a bench player. `players` is the catch-all, so it is checked last.
 */
async function resolveLeagueSlots(
  sleeperId: string,
  leagueIds: string[]
): Promise<LeagueSlot[]> {
  if (leagueIds.length === 0) return []

  const leagues = await prisma.league.findMany({
    where: { id: { in: leagueIds } },
    select: { id: true, name: true, platform: true, leagueType: true },
  })
  const byId = new Map(leagues.map((l) => [l.id, l]))

  const rosters = await prisma.roster.findMany({
    where: { leagueId: { in: leagueIds } },
    select: { leagueId: true, playerData: true },
  })

  const out: LeagueSlot[] = []
  const claimed = new Set<string>()

  for (const r of rosters) {
    if (claimed.has(r.leagueId)) continue
    const pd = (r.playerData ?? {}) as Record<string, unknown>

    for (const key of SLOT_ORDER) {
      const arr = pd[key]
      if (!Array.isArray(arr)) continue
      if (!arr.map(String).includes(sleeperId)) continue

      const league = byId.get(r.leagueId)
      out.push({
        leagueId: r.leagueId,
        leagueName: league?.name ?? 'League',
        platform: String(league?.platform ?? 'manual').toLowerCase(),
        format: league?.leagueType ?? null,
        slot: slotLabel(key),
        isYours: true,
      })
      claimed.add(r.leagueId)
      break
    }
  }

  return out
}

export async function getPlayerDetail(
  externalId: string,
  userLeagueIds: string[]
): Promise<PlayerDetail | null> {
  const row = await prisma.sportsPlayer.findFirst({
    where: { externalId },
    select: {
      externalId: true, sleeperId: true, name: true, position: true, team: true,
      imageUrl: true, number: true, height: true, weight: true, age: true,
      college: true, sport: true, fetchedAt: true,
    },
  })
  if (!row) return null

  const identityResolved = Boolean(row.sleeperId)

  const leagues: SectionState<LeagueSlot[]> = !identityResolved
    ? {
        available: false,
        reason:
          'we have no platform id for this player, so we cannot tell which of your leagues roster him',
      }
    : { available: true, data: await resolveLeagueSlots(row.sleeperId!, userLeagueIds) }

  // Injuries come from the ESPN writer — TheSportsDB serves none at all.
  const injuryRow = await prisma.sportsInjury
    .findFirst({
      where: { sport: row.sport, playerName: { equals: row.name, mode: 'insensitive' } },
      orderBy: { fetchedAt: 'desc' },
      select: { status: true, description: true, date: true, fetchedAt: true },
    })
    .catch(() => null)

  const injury: SectionState<{ status: string | null; description: string | null; reportedAt: Date | null }> =
    injuryRow
      ? {
          available: true,
          data: { status: injuryRow.status, description: injuryRow.description, reportedAt: injuryRow.date },
        }
      : { available: false, reason: 'no injury designation on file — which is not the same as healthy' }

  const stats = await prisma.playerSeasonStats
    .findMany({
      where: { sport: row.sport, playerName: { equals: row.name, mode: 'insensitive' } },
      orderBy: { season: 'desc' },
      take: 5,
      select: { season: true, stats: true },
    })
    .catch(() => [])

  const seasonStats: SectionState<Array<{ season: string; stats: Record<string, string> }>> =
    stats.length > 0
      ? {
          available: true,
          data: stats.map((s) => ({ season: s.season, stats: (s.stats ?? {}) as Record<string, string> })),
        }
      : { available: false, reason: 'no season statistics ingested for this player' }

  const age = describeAge('player_bio', row.fetchedAt)

  return {
    player: {
      externalId: row.externalId,
      sleeperId: row.sleeperId,
      name: row.name,
      position: row.position,
      team: row.team,
      imageUrl: row.imageUrl,
      number: row.number,
      rosteredIn: leagues.available ? leagues.data.length : null,
      platforms: leagues.available ? [...new Set(leagues.data.map((l) => l.platform))] : [],
    },
    identityResolved,
    bio: { height: row.height, weight: row.weight, age: row.age, college: row.college },
    injury,
    seasonStats,
    leagues,
    // Each of these is a number the handoff shows and we cannot compute. A
    // projection under "this league's own scoring settings" needs a projection
    // feed we do not have; snap share is not ingested at all; position rank
    // needs a full-position ranking rather than one player's stats.
    projection: { available: false, reason: 'no weekly projection feed ingested' },
    snapShare: { available: false, reason: 'snap share is not ingested by any current provider' },
    positionRank: { available: false, reason: 'requires a ranked positional set we do not compute yet' },
    recommendedMoves: {
      available: false,
      reason: 'a move recommendation needs projections and your lineup — neither is ingested for imported leagues',
    },
    freshness: { label: age.label, stale: age.stale },
  }
}
