import 'server-only'

import { prisma } from '@/lib/prisma'
import { leagueDisplayName, type SectionState, type UnavailableSection } from './leagueHome'

/**
 * My team · roster — "read-only view of your real lineup, with the fix and where
 * to make it".
 *
 * Identifying WHICH roster is yours goes LeagueTeam.claimedByUserId → its
 * platformUserId/externalId → Roster.platformUserId. Roster.platformUserId is
 * the always-set column; LeagueTeam.platformUserId is nullable and gating on it
 * has previously locked real members out of their own league, so it is used as a
 * hint here and never as the sole key.
 *
 * The lineup itself is real: Roster.playerData carries `starters` in slot order
 * plus `players`, `reserve` and `taxi`. Each id resolves through
 * SportsPlayer.sleeperId to a name, position, team and headshot.
 *
 * Game context and the lineup lock are derived from the INGESTED SCHEDULE — the
 * kickoff of each starter's real-world game — rather than from a projection feed
 * we do not have. That makes the countdown in the handoff's lock banner a real
 * number instead of a decorative one.
 */

export type LineupPlayer = {
  sleeperId: string
  name: string
  position: string | null
  team: string | null
  imageUrl: string | null
  /** "DEN vs LV · 4:05p" — from the ingested schedule, null when unknown. */
  gameContext: string | null
  kickoff: Date | null
  injuryStatus: string | null
}

export type LineupSlot = {
  slotLabel: string
  player: LineupPlayer | null
  /**
   * The slot genuinely holds nobody — the platform recorded an unfilled starter.
   * This drives the handoff's --bad-soft empty state and the lock-time urgency.
   */
  empty: boolean
  /**
   * A player IS in this slot, but we could not resolve his id to a player row.
   *
   * ⚠ Kept strictly separate from `empty`. An unresolved id means our identity
   * bridge failed; an empty slot means the user has a hole in their lineup.
   * Rendering the first as the second tells someone their FLEX is empty when a
   * player is sitting in it — and sends them to the platform to fix nothing.
   */
  unresolvedId: string | null
}

export type MyTeamData = {
  league: { id: string; name: string; platform: string; format: string | null }
  team: SectionState<{
    teamName: string
    ownerName: string
    record: string
    rank: number | null
    pointsFor: number
    pointsAgainst: number
    teamCount: number
  }>
  starters: SectionState<LineupSlot[]>
  bench: SectionState<LineupPlayer[]>
  reserve: SectionState<LineupPlayer[]>
  /** Earliest kickoff among starters — the real lineup lock. */
  lock: SectionState<{ at: Date; anyEmptySlot: boolean }>
  projections: UnavailableSection
  rosterGrade: UnavailableSection
  liveScore: UnavailableSection
}

/** Slot labels in the order fantasy lineups conventionally read. */
function inferSlotLabel(position: string | null, index: number): string {
  const p = (position ?? '').toUpperCase()
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST'].includes(p)) return p === 'DST' ? 'DEF' : p
  return p || `SLOT ${index + 1}`
}

function formatKickoff(d: Date | null): string | null {
  if (!d) return null
  const hours = d.getUTCHours()
  const mins = d.getUTCMinutes()
  const ampm = hours >= 12 ? 'p' : 'a'
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return `${h12}:${String(mins).padStart(2, '0')}${ampm}`
}

async function resolvePlayers(
  ids: string[],
  sport: string
): Promise<Map<string, LineupPlayer>> {
  const out = new Map<string, LineupPlayer>()
  if (ids.length === 0) return out

  const rows = await prisma.sportsPlayer.findMany({
    where: { sleeperId: { in: ids } },
    select: { sleeperId: true, name: true, position: true, team: true, imageUrl: true },
  })

  // One upcoming game per team, so a lineup row can say who the player faces and
  // when. Pulled once for the whole roster rather than per player.
  const teams = [...new Set(rows.map((r) => r.team).filter(Boolean))] as string[]
  const games =
    teams.length > 0
      ? await prisma.sportsGame
          .findMany({
            where: {
              sport,
              startTime: { gte: new Date(Date.now() - 6 * 3600 * 1000) },
              OR: [{ homeTeam: { in: teams } }, { awayTeam: { in: teams } }],
            },
            orderBy: { startTime: 'asc' },
            take: 400,
            select: { homeTeam: true, awayTeam: true, startTime: true },
          })
          .catch(() => [])
      : []

  const nextGameFor = new Map<string, { opponent: string; home: boolean; at: Date | null }>()
  for (const g of games) {
    for (const [team, opponent, home] of [
      [g.homeTeam, g.awayTeam, true],
      [g.awayTeam, g.homeTeam, false],
    ] as const) {
      if (!teams.includes(team)) continue
      if (nextGameFor.has(team)) continue
      nextGameFor.set(team, { opponent, home, at: g.startTime })
    }
  }

  const injuries = await prisma.sportsInjury
    .findMany({
      where: { sport, playerName: { in: rows.map((r) => r.name) } },
      orderBy: { fetchedAt: 'desc' },
      select: { playerName: true, status: true },
    })
    .catch(() => [])
  const injuryByName = new Map(injuries.map((i) => [i.playerName.toLowerCase(), i.status]))

  for (const r of rows) {
    if (!r.sleeperId) continue
    const g = r.team ? nextGameFor.get(r.team) : undefined
    const time = formatKickoff(g?.at ?? null)
    out.set(r.sleeperId, {
      sleeperId: r.sleeperId,
      name: r.name,
      position: r.position,
      team: r.team,
      imageUrl: r.imageUrl,
      gameContext: g ? `${r.team} ${g.home ? 'vs' : '@'} ${g.opponent}${time ? ` · ${time}` : ''}` : null,
      kickoff: g?.at ?? null,
      injuryStatus: injuryByName.get(r.name.toLowerCase()) ?? null,
    })
  }

  return out
}

export async function getMyTeamData(leagueId: string, userId: string): Promise<MyTeamData | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, platform: true, leagueType: true, sport: true },
  })
  if (!league) return null

  const sport = String(league.sport ?? 'NFL')
  const base = {
    league: {
      id: league.id,
      name: leagueDisplayName(league.name),
      platform: String(league.platform ?? 'manual').toLowerCase(),
      format: league.leagueType ?? null,
    },
    projections: { available: false as const, reason: 'no weekly projection feed ingested' },
    rosterGrade: {
      available: false as const,
      reason: 'a roster grade needs projections and positional replacement levels we do not compute yet',
    },
    liveScore: { available: false as const, reason: 'no live scoring ingested for imported leagues' },
  }

  const myTeamRow = await prisma.leagueTeam.findFirst({
    where: { leagueId, claimedByUserId: userId },
    select: {
      teamName: true, ownerName: true, wins: true, losses: true, ties: true,
      pointsFor: true, pointsAgainst: true, currentRank: true,
      platformUserId: true, externalId: true,
    },
  })

  const teamCount = await prisma.leagueTeam.count({ where: { leagueId } })

  if (!myTeamRow) {
    const unknown = {
      available: false as const,
      reason: 'we cannot tell which team in this league is yours — claim it and the lineup appears here',
    }
    return {
      ...base,
      team: unknown,
      starters: unknown,
      bench: unknown,
      reserve: unknown,
      lock: unknown,
    }
  }

  const anyResults =
    myTeamRow.wins > 0 || myTeamRow.losses > 0 || myTeamRow.ties > 0 || myTeamRow.pointsFor > 0

  const team: MyTeamData['team'] = {
    available: true,
    data: {
      teamName: myTeamRow.teamName,
      ownerName: myTeamRow.ownerName,
      // Same rule as screen 2: an all-zero record is an absence, not a result.
      record: anyResults
        ? myTeamRow.ties > 0
          ? `${myTeamRow.wins}-${myTeamRow.losses}-${myTeamRow.ties}`
          : `${myTeamRow.wins}-${myTeamRow.losses}`
        : 'no results read yet',
      rank: myTeamRow.currentRank,
      pointsFor: myTeamRow.pointsFor,
      pointsAgainst: myTeamRow.pointsAgainst,
      teamCount,
    },
  }

  // Roster.platformUserId is always set; LeagueTeam.platformUserId is not, so it
  // is one candidate among several rather than the key.
  const candidates = [myTeamRow.platformUserId, myTeamRow.externalId].filter(Boolean) as string[]
  const roster =
    candidates.length > 0
      ? await prisma.roster.findFirst({
          where: { leagueId, platformUserId: { in: candidates } },
          select: { playerData: true },
        })
      : null

  if (!roster) {
    const noRoster = {
      available: false as const,
      reason: 'no roster rows imported for your team in this league',
    }
    return { ...base, team, starters: noRoster, bench: noRoster, reserve: noRoster, lock: noRoster }
  }

  const pd = (roster.playerData ?? {}) as Record<string, unknown>
  const asIds = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (x == null ? '' : String(x))).filter(Boolean) : []

  const starterIds = asIds(pd.starters)
  const allIds = asIds(pd.players)
  const reserveIds = asIds(pd.reserve)
  const taxiIds = asIds(pd.taxi)

  const resolved = await resolvePlayers(
    [...new Set([...starterIds, ...allIds, ...reserveIds, ...taxiIds])],
    sport
  )

  // Sleeper encodes an unfilled starting slot as "0" — that is the handoff's
  // "FLEX is empty" state, and it must survive as an empty slot rather than
  // being filtered out into a shorter lineup that looks complete.
  const starters: LineupSlot[] = starterIds.map((id, i) => {
    const isEmptySlot = id === '0'
    const player = isEmptySlot ? null : resolved.get(id) ?? null
    return {
      slotLabel: inferSlotLabel(player?.position ?? null, i),
      player,
      empty: isEmptySlot,
      // Present id, no player row — a lookup failure, NOT an empty slot.
      unresolvedId: !isEmptySlot && player == null ? id : null,
    }
  })

  const starterSet = new Set(starterIds)
  const benchIds = allIds.filter((id) => !starterSet.has(id) && !reserveIds.includes(id))

  const kickoffs = starters
    .map((s) => s.player?.kickoff)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    ...base,
    team,
    starters:
      starters.length > 0
        ? { available: true, data: starters }
        : { available: false, reason: 'no starting lineup recorded on this roster' },
    bench:
      benchIds.length > 0
        ? { available: true, data: benchIds.map((id) => resolved.get(id)).filter(Boolean) as LineupPlayer[] }
        : { available: false, reason: 'no bench players recorded on this roster' },
    reserve:
      reserveIds.length + taxiIds.length > 0
        ? {
            available: true,
            data: [...reserveIds, ...taxiIds]
              .map((id) => resolved.get(id))
              .filter(Boolean) as LineupPlayer[],
          }
        : { available: false, reason: 'no IR or taxi players on this roster' },
    lock:
      kickoffs.length > 0
        ? { available: true, data: { at: kickoffs[0], anyEmptySlot: starters.some((s) => s.empty) } }
        : {
            available: false,
            reason: 'no upcoming game found for your starters, so there is no lock time to count down to',
          },
  }
}
