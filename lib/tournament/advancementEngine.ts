import { prisma } from '@/lib/prisma'

export type StandingRow = {
  tournamentLeagueParticipantId: string
  participantId: string
  userId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  leagueRank: number
}

export type LeagueStandingsResult = { leagueId: string; rows: StandingRow[] }

export type ConferenceStandingsResult = { conferenceId: string; rows: StandingRow[] }

export type AdvancementResult = {
  directQualifiers: string[]
  wildcards: string[]
  bubble: string[]
  eliminated: string[]
}

function compareStandings(
  a: { wins: number; pointsFor: number; pointsAgainst: number },
  b: { wins: number; pointsFor: number; pointsAgainst: number },
  tiebreakerMode: string,
): number {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
  if (tiebreakerMode === 'points_against_inverse') {
    if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst
  }
  return 0
}

export async function calculateLeagueStandings(tournamentLeagueId: string): Promise<LeagueStandingsResult> {
  const tl = await prisma.tournamentLeague.findUnique({
    where: { id: tournamentLeagueId },
    include: { league: true, tournament: true },
  })
  if (!tl?.leagueId) throw new Error('Tournament league has no underlying league yet')

  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId: tl.leagueId },
    orderBy: { createdAt: 'desc' },
  })

  const shell = tl.tournament
  const rosterByUser = new Map<string, { wins: number; losses: number; ties: number; pf: number; pa: number }>()

  if (season) {
    const rosters = await prisma.redraftRoster.findMany({ where: { seasonId: season.id } })
    for (const r of rosters) {
      rosterByUser.set(r.ownerId, {
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        pf: r.pointsFor,
        pa: r.pointsAgainst,
      })
    }
  }

  const participants = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId },
    include: { participant: true },
  })

  const rows: StandingRow[] = []
  for (const lp of participants) {
    const st = rosterByUser.get(lp.userId) ?? {
      wins: lp.wins,
      losses: lp.losses,
      ties: lp.ties,
      pf: lp.pointsFor,
      pa: lp.pointsAgainst,
    }
    await prisma.tournamentLeagueParticipant.update({
      where: { id: lp.id },
      data: {
        wins: st.wins,
        losses: st.losses,
        ties: st.ties,
        pointsFor: st.pf,
        pointsAgainst: st.pa,
      },
    })
    rows.push({
      tournamentLeagueParticipantId: lp.id,
      participantId: lp.participantId,
      userId: lp.userId,
      wins: st.wins,
      losses: st.losses,
      ties: st.ties,
      pointsFor: st.pf,
      pointsAgainst: st.pa,
      leagueRank: 0,
    })
  }

  rows.sort((a, b) => compareStandings(a, b, shell.tiebreakerMode))
  let rank = 1
  for (const r of rows) {
    r.leagueRank = rank++
    await prisma.tournamentLeagueParticipant.update({
      where: { id: r.tournamentLeagueParticipantId },
      data: { leagueRank: r.leagueRank },
    })
  }

  if (tl.conferenceId) {
    await calculateConferenceStandings(tl.conferenceId)
  }

  return { leagueId: tournamentLeagueId, rows }
}

export async function calculateConferenceStandings(conferenceId: string): Promise<ConferenceStandingsResult> {
  const conference = await prisma.tournamentConference.findUnique({
    where: { id: conferenceId },
    include: { tournament: true },
  })
  if (!conference) throw new Error('Conference not found')

  const leagues = await prisma.tournamentLeague.findMany({
    where: { conferenceId },
    select: { id: true },
  })
  const leagueIds = leagues.map((l) => l.id)
  const tlpRows = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId: { in: leagueIds } },
  })

  const merged = tlpRows.map((lp) => ({
    tournamentLeagueParticipantId: lp.id,
    participantId: lp.participantId,
    userId: lp.userId,
    wins: lp.wins,
    losses: lp.losses,
    ties: lp.ties,
    pointsFor: lp.pointsFor,
    pointsAgainst: lp.pointsAgainst,
    leagueRank: 0,
  }))

  merged.sort((a, b) => compareStandings(a, b, conference.tournament.tiebreakerMode))
  let r = 1
  for (const row of merged) {
    row.leagueRank = r++
    await prisma.tournamentLeagueParticipant.update({
      where: { id: row.tournamentLeagueParticipantId },
      data: { conferenceRank: row.leagueRank },
    })
  }

  const cache = merged.map((x) => ({
    participantId: x.participantId,
    userId: x.userId,
    wins: x.wins,
    losses: x.losses,
    pointsFor: x.pointsFor,
    rank: x.leagueRank,
  }))

  await prisma.tournamentConference.update({
    where: { id: conferenceId },
    data: { standingsCache: cache },
  })

  return { conferenceId, rows: merged }
}

export async function identifyQualifiers(
  tournamentId: string,
  fromRoundId: string,
): Promise<AdvancementResult> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const tls = await prisma.tournamentLeague.findMany({ where: { tournamentId, roundId: fromRoundId } })
  for (const tl of tls) {
    await calculateLeagueStandings(tl.id)
  }

  const conferences = await prisma.tournamentConference.findMany({ where: { tournamentId } })
  for (const c of conferences) {
    await calculateConferenceStandings(c.id)
  }

  const directQualifiers: string[] = []
  const wildcards: string[] = []
  const bubble: string[] = []
  const eliminated: string[] = []

  for (const tl of tls) {
    const top = await prisma.tournamentLeagueParticipant.findMany({
      where: { tournamentLeagueId: tl.id },
      orderBy: [{ leagueRank: 'asc' }],
      take: shell.advancersPerLeague,
    })
    for (const t of top) {
      directQualifiers.push(t.participantId)
      await prisma.tournamentLeagueParticipant.update({
        where: { id: t.id },
        data: { advancementStatus: 'qualified' },
      })
    }
  }

  for (const conf of conferences) {
    const inConf = await prisma.tournamentLeague.findMany({
      where: { conferenceId: conf.id, roundId: fromRoundId },
      select: { id: true },
    })
    const leagueIds = inConf.map((x) => x.id)
    const nonQual = await prisma.tournamentLeagueParticipant.findMany({
      where: {
        tournamentLeagueId: { in: leagueIds },
        advancementStatus: { not: 'qualified' },
      },
      orderBy: [{ conferenceRank: 'asc' }],
    })

    const wc = shell.wildcardCount
    for (let i = 0; i < wc && i < nonQual.length; i++) {
      const row = nonQual[i]!
      wildcards.push(row.participantId)
      await prisma.tournamentLeagueParticipant.update({
        where: { id: row.id },
        data: { advancementStatus: 'wildcard_eligible' },
      })
    }

    const rest = nonQual.slice(wc)
    if (shell.bubbleEnabled) {
      const half = Math.min(shell.bubbleSize, rest.length)
      for (let i = 0; i < half; i++) {
        const row = rest[i]!
        bubble.push(row.participantId)
        await prisma.tournamentLeagueParticipant.update({
          where: { id: row.id },
          data: { advancementStatus: 'bubble' },
        })
      }
      for (let i = half; i < rest.length; i++) {
        const row = rest[i]!
        eliminated.push(row.participantId)
        await prisma.tournamentLeagueParticipant.update({
          where: { id: row.id },
          data: { advancementStatus: 'eliminated' },
        })
      }
    } else {
      for (const row of rest) {
        eliminated.push(row.participantId)
        await prisma.tournamentLeagueParticipant.update({
          where: { id: row.id },
          data: { advancementStatus: 'eliminated' },
        })
      }
    }
  }

  await prisma.tournamentAdvancementGroup.create({
    data: {
      tournamentId,
      fromRoundId,
      groupType: 'direct_qualifier',
      participantIds: directQualifiers,
      maxSize: directQualifiers.length,
      bubbleWinnerIds: [],
    },
  })

  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      type: 'qualifier_announced',
      title: 'Qualifiers set',
      content: `Direct qualifiers: ${directQualifiers.length}. Wildcards: ${wildcards.length}. Bubble: ${bubble.length}.`,
      targetAudience: 'all',
    },
  })

  return { directQualifiers, wildcards, bubble, eliminated }
}

export async function executeAdvancement(tournamentId: string, fromRoundNumber: number): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  })
  if (!shell) throw new Error('Tournament not found')
  const fromRound = shell.rounds.find((r) => r.roundNumber === fromRoundNumber)
  const toRound = shell.rounds.find((r) => r.roundNumber === fromRoundNumber + 1)
  if (!fromRound || !toRound) throw new Error('Invalid round transition')

  const advancing = await prisma.tournamentLeagueParticipant.findMany({
    where: {
      advancementStatus: { in: ['qualified', 'wildcard_eligible'] },
      league: { tournamentId, roundId: fromRound.id },
    },
    select: { participantId: true },
  })
  const movers = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      id: { in: advancing.map((a) => a.participantId) },
    },
  })

  const ids = movers.map((m) => m.id)
  shuffleInPlace(ids)

  await prisma.tournamentShellAuditLog.create({
    data: {
      tournamentId,
      roundNumber: fromRoundNumber,
      action: 'advancement_calculated',
      actorType: 'system',
      data: { advanced: ids.length, toRound: toRound.roundNumber },
    },
  })

  await prisma.tournamentShell.update({
    where: { id: tournamentId },
    data: { currentRoundNumber: toRound.roundNumber, status: 'redrafting' },
  })
}

function shuffleInPlace(arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

export async function handleEliminations(
  tournamentId: string,
  eliminatedParticipantIds: string[],
): Promise<void> {
  await prisma.tournamentParticipant.updateMany({
    where: { tournamentId, id: { in: eliminatedParticipantIds } },
    data: { status: 'eliminated' },
  })
  const remaining = await prisma.tournamentParticipant.count({
    where: { tournamentId, status: { not: 'eliminated' } },
  })
  await prisma.tournamentShell.update({
    where: { id: tournamentId },
    data: { currentParticipantCount: remaining },
  })
}
