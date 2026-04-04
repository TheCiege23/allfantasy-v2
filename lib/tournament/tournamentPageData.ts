/**
 * Server-only read model for Tournament Shell UI (App Router RSC).
 * Not part of advancement/scoring engines — presentation data only.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'

export type SerializedConference = {
  id: string
  name: string
  slug: string
  theme: string | null
  colorHex: string | null
  conferenceNumber: number
}

export type SerializedRound = {
  id: string
  roundNumber: number
  roundType: string
  roundLabel: string
  weekStart: number
  weekEnd: number
  status: string
}

export type SerializedTournamentLeague = {
  id: string
  name: string
  slug: string
  roundId: string
  conferenceId: string | null
  leagueId: string | null
  status: string
  teamSlots: number
  currentTeamCount: number
  draftScheduledAt: string | null
  colorHex: string | null
  logoUrl: string | null
  advancersCount: number
}

export type SerializedParticipant = {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  status: string
  currentRoundNumber: number
  furthestRoundReached: number
  currentConferenceId: string | null
  currentLeagueId: string | null
  careerWins: number
  careerLosses: number
  careerPointsFor: number
  careerPointsAgainst: number
  advancementHistory: unknown
}

export type SerializedAnnouncement = {
  id: string
  type: string
  title: string
  content: string
  roundNumber: number | null
  createdAt: string
  isPosted: boolean
}

export type SerializedShell = {
  id: string
  name: string
  sport: string
  status: string
  maxParticipants: number
  currentParticipantCount: number
  conferenceCount: number
  leaguesPerConference: number
  teamsPerLeague: number
  namingMode: string
  currentRoundNumber: number
  totalRounds: number
  advancersPerLeague: number
  wildcardCount: number
  bubbleEnabled: boolean
  bubbleSize: number
  bubbleScoringMode: string
  scoringSystem: string
  draftType: string
  waiverType: string
  openingRosterSize: number
  tournamentRosterSize: number
  eliteRosterSize: number
  faabResetOnRedraft: boolean
  draftClockSeconds: number
  simultaneousDrafts: boolean
  tiebreakerMode: string
  standingsVisibility: string
}

export type TournamentLayoutPayload = {
  shell: SerializedShell
  conferences: SerializedConference[]
  rounds: SerializedRound[]
  tournamentLeagues: SerializedTournamentLeague[]
  participant: SerializedParticipant | null
  isCommissioner: boolean
  announcements: SerializedAnnouncement[]
}

function dt(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

export async function loadTournamentLayoutPayload(
  tournamentId: string,
  userId: string | null,
): Promise<TournamentLayoutPayload | null> {
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    include: {
      conferences: { orderBy: { conferenceNumber: 'asc' } },
      rounds: { orderBy: { roundNumber: 'asc' } },
      tournamentLeagues: true,
      announcements: { orderBy: { createdAt: 'desc' }, take: 24 },
    },
  })

  if (!shell) return null

  const participant = userId
    ? await prisma.tournamentParticipant.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
      })
    : null

  const serializedShell: SerializedShell = {
    id: shell.id,
    name: shell.name,
    sport: shell.sport,
    status: shell.status,
    maxParticipants: shell.maxParticipants,
    currentParticipantCount: shell.currentParticipantCount,
    conferenceCount: shell.conferenceCount,
    leaguesPerConference: shell.leaguesPerConference,
    teamsPerLeague: shell.teamsPerLeague,
    namingMode: shell.namingMode,
    currentRoundNumber: shell.currentRoundNumber,
    totalRounds: shell.totalRounds,
    advancersPerLeague: shell.advancersPerLeague,
    wildcardCount: shell.wildcardCount,
    bubbleEnabled: shell.bubbleEnabled,
    bubbleSize: shell.bubbleSize,
    bubbleScoringMode: shell.bubbleScoringMode,
    scoringSystem: shell.scoringSystem,
    draftType: shell.draftType,
    waiverType: shell.waiverType,
    openingRosterSize: shell.openingRosterSize,
    tournamentRosterSize: shell.tournamentRosterSize,
    eliteRosterSize: shell.eliteRosterSize,
    faabResetOnRedraft: shell.faabResetOnRedraft,
    draftClockSeconds: shell.draftClockSeconds,
    simultaneousDrafts: shell.simultaneousDrafts,
    tiebreakerMode: shell.tiebreakerMode,
    standingsVisibility: shell.standingsVisibility,
  }

  return {
    shell: serializedShell,
    conferences: shell.conferences.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      theme: c.theme,
      colorHex: c.colorHex,
      conferenceNumber: c.conferenceNumber,
    })),
    rounds: shell.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      roundType: r.roundType,
      roundLabel: r.roundLabel,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      status: r.status,
    })),
    tournamentLeagues: shell.tournamentLeagues.map((tl) => ({
      id: tl.id,
      name: tl.name,
      slug: tl.slug,
      roundId: tl.roundId,
      conferenceId: tl.conferenceId,
      leagueId: tl.leagueId,
      status: tl.status,
      teamSlots: tl.teamSlots,
      currentTeamCount: tl.currentTeamCount,
      draftScheduledAt: dt(tl.draftScheduledAt),
      colorHex: tl.colorHex,
      logoUrl: tl.logoUrl,
      advancersCount: tl.advancersCount,
    })),
    participant: participant
      ? {
          id: participant.id,
          userId: participant.userId,
          displayName: participant.displayName,
          avatarUrl: participant.avatarUrl,
          status: participant.status,
          currentRoundNumber: participant.currentRoundNumber,
          furthestRoundReached: participant.furthestRoundReached,
          currentConferenceId: participant.currentConferenceId,
          currentLeagueId: participant.currentLeagueId,
          careerWins: participant.careerWins,
          careerLosses: participant.careerLosses,
          careerPointsFor: participant.careerPointsFor,
          careerPointsAgainst: participant.careerPointsAgainst,
          advancementHistory: participant.advancementHistory,
        }
      : null,
    isCommissioner: Boolean(userId && shell.commissionerId === userId),
    announcements: shell.announcements.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      content: a.content,
      roundNumber: a.roundNumber,
      createdAt: a.createdAt.toISOString(),
      isPosted: a.isPosted,
    })),
  }
}
