import 'server-only'

import { prisma } from '@/lib/prisma'
import type { SectionState } from './leagueHome'

/**
 * Matchup — "live head-to-head, what's left to play, and what decides it".
 *
 * ⚠ WeeklyMatchup.leagueId IS THE PLATFORM LEAGUE ID, not our canonical
 * League.id. Querying it with a League.id returns nothing and the screen reports
 * "no matchup data" for a league that has a full season of it — the two-id-space
 * trap this codebase has fallen into repeatedly. The lookup below goes
 * League.platformLeagueId → WeeklyMatchup.leagueId deliberately.
 *
 * ⚠ Only some of that data is reachable. Of six leagues with WeeklyMatchup rows,
 * three have no canonical League row at all — including the one holding a full
 * 17-week season. That data is orphaned, not ours to show, and the screen says
 * the week is unavailable rather than pretending the league never played.
 *
 * Rosters pair by matchupId: two roster ids sharing one matchupId are the two
 * sides of a game. rosterId joins to LeagueTeam.externalId.
 */

export type MatchupSide = {
  teamName: string
  ownerName: string
  record: string | null
  points: number
  isYou: boolean
}

export type MatchupData = {
  league: { id: string; name: string; platform: string }
  week: SectionState<{ week: number; season: number; isFinal: boolean }>
  sides: SectionState<{ you: MatchupSide; opponent: MatchupSide }>
  /** Per-player live scoring — the handoff's centre column. */
  playerScoring: SectionState<never>
  winProbability: SectionState<never>
  projectedFinal: SectionState<never>
  yetToPlay: SectionState<never>
}

export async function getMatchupData(
  leagueId: string,
  userId: string,
  weekParam?: number | null
): Promise<MatchupData | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, platform: true, platformLeagueId: true, season: true },
  })
  if (!league) return null

  const base = {
    league: {
      id: league.id,
      name: league.name,
      platform: String(league.platform ?? 'manual').toLowerCase(),
    },
    // Each of these needs per-player weekly scoring, which no writer produces for
    // imported leagues. A win probability invented from a points ratio is the
    // most authoritative-looking wrong number this product could print.
    playerScoring: {
      available: false as const,
      reason: 'per-player weekly scoring is not ingested for imported leagues',
    },
    winProbability: {
      available: false as const,
      reason:
        'a win probability needs live scores and players yet to play — neither is ingested, and a ratio of current points would not be a probability',
    },
    projectedFinal: { available: false as const, reason: 'no weekly projection feed ingested' },
    yetToPlay: {
      available: false as const,
      reason: 'requires per-player game state, which is not ingested for imported leagues',
    },
  }

  const platformLeagueId = league.platformLeagueId
  if (!platformLeagueId) {
    const noPlatform = {
      available: false as const,
      reason: 'this league has no platform id, so its weekly results cannot be located',
    }
    return { ...base, week: noPlatform, sides: noPlatform }
  }

  // Which team is the user's, in canonical space.
  const myTeam = await prisma.leagueTeam.findFirst({
    where: { leagueId: league.id, claimedByUserId: userId },
    select: { externalId: true, teamName: true, ownerName: true, wins: true, losses: true, ties: true },
  })

  const latest = await prisma.weeklyMatchup.findFirst({
    where: { leagueId: platformLeagueId, ...(weekParam ? { week: weekParam } : {}) },
    orderBy: [{ seasonYear: 'desc' }, { week: 'desc' }],
    select: { week: true, seasonYear: true },
  })

  if (!latest) {
    const noWeek = {
      available: false as const,
      reason: 'no weekly results stored for this league',
    }
    return { ...base, week: noWeek, sides: noWeek }
  }

  const rows = await prisma.weeklyMatchup.findMany({
    where: { leagueId: platformLeagueId, seasonYear: latest.seasonYear, week: latest.week },
    select: { rosterId: true, matchupId: true, pointsFor: true, pointsAgainst: true, win: true },
  })

  // A week where every row is 0-0 has been created but never scored. Showing it
  // as a 0-0 head-to-head presents an unplayed week as a result.
  const anyPoints = rows.some((r) => r.pointsFor > 0 || r.pointsAgainst > 0)

  const week: MatchupData['week'] = {
    available: true,
    data: { week: latest.week, season: latest.seasonYear, isFinal: anyPoints },
  }

  if (!myTeam?.externalId) {
    return {
      ...base,
      week,
      sides: {
        available: false,
        reason: 'we cannot tell which team in this league is yours, so there is no matchup to show',
      },
    }
  }

  const myRosterId = Number.parseInt(String(myTeam.externalId), 10)
  const mine = rows.find((r) => r.rosterId === myRosterId)

  if (!mine) {
    return {
      ...base,
      week,
      sides: { available: false, reason: `your team has no result stored for week ${latest.week}` },
    }
  }

  if (!anyPoints) {
    return {
      ...base,
      week,
      sides: {
        available: false,
        reason: `week ${latest.week} is on file but nothing has been scored — this is an unplayed week, not a 0-0 game`,
      },
    }
  }

  const opponentRow =
    mine.matchupId != null
      ? rows.find((r) => r.matchupId === mine.matchupId && r.rosterId !== mine.rosterId)
      : undefined

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId: league.id },
    select: { externalId: true, teamName: true, ownerName: true, wins: true, losses: true, ties: true },
  })
  const teamByExternal = new Map(teams.map((t) => [String(t.externalId), t]))

  const recordOf = (t?: { wins: number; losses: number; ties: number }) =>
    !t || (t.wins === 0 && t.losses === 0 && t.ties === 0)
      ? null
      : t.ties > 0
        ? `${t.wins}-${t.losses}-${t.ties}`
        : `${t.wins}-${t.losses}`

  const you: MatchupSide = {
    teamName: myTeam.teamName,
    ownerName: myTeam.ownerName,
    record: recordOf(myTeam),
    points: mine.pointsFor,
    isYou: true,
  }

  if (!opponentRow) {
    // A bye, or an unpaired row. `pointsAgainst` still tells us what the other
    // side scored, so the score line is real even when the opponent is unnamed.
    return {
      ...base,
      week,
      sides: {
        available: true,
        data: {
          you,
          opponent: {
            teamName: 'Opponent not identified',
            ownerName: '',
            record: null,
            points: mine.pointsAgainst,
            isYou: false,
          },
        },
      },
    }
  }

  const oppTeam = teamByExternal.get(String(opponentRow.rosterId))

  return {
    ...base,
    week,
    sides: {
      available: true,
      data: {
        you,
        opponent: {
          teamName: oppTeam?.teamName ?? `Roster ${opponentRow.rosterId}`,
          ownerName: oppTeam?.ownerName ?? '',
          record: recordOf(oppTeam),
          points: opponentRow.pointsFor,
          isYou: false,
        },
      },
    },
  }
}
