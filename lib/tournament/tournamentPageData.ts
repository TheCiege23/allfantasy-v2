/**
 * Server-only read model for Tournament Shell UI (App Router RSC).
 * Not part of advancement/scoring engines — presentation data only.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import { DEFAULT_TOURNAMENT_SETTINGS } from '@/lib/tournament-mode/constants'
import type { TournamentSettings } from '@/lib/tournament-mode/types'

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

export type LegacyFeederLeagueRow = {
  tournamentLeagueId: string
  leagueId: string
  name: string
  inviteCode: string
  joinUrl: string
  conferenceName: string
}

export type TournamentLayoutPayload = {
  shell: SerializedShell
  conferences: SerializedConference[]
  rounds: SerializedRound[]
  tournamentLeagues: SerializedTournamentLeague[]
  participant: SerializedParticipant | null
  isCommissioner: boolean
  announcements: SerializedAnnouncement[]
  /** Wizard-created (`LegacyTournament`) vs `TournamentShell` hub. */
  hubKind: 'shell' | 'legacy'
  /** Feeder leagues + invite links (legacy tournaments; commissioner hub). */
  legacyFeederLeagues?: LegacyFeederLeagueRow[]
}

function dt(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

function slugifySegment(s: string, fallback: string): string {
  const x = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return x || fallback
}

function mergeLegacySettings(raw: unknown): TournamentSettings {
  const patch =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Partial<TournamentSettings>)
      : {}
  return { ...DEFAULT_TOURNAMENT_SETTINGS, ...patch }
}

async function loadLegacyTournamentLayoutPayload(
  tournamentId: string,
  userId: string | null,
): Promise<TournamentLayoutPayload | null> {
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: {
      conferences: { orderBy: { orderIndex: 'asc' } },
      rounds: { orderBy: { roundIndex: 'asc' } },
      leagues: {
        include: {
          league: { include: { teams: true } },
          conference: true,
        },
        orderBy: [{ conferenceId: 'asc' }, { orderInConference: 'asc' }],
      },
      announcements: { orderBy: { createdAt: 'desc' }, take: 24 },
    },
  })

  if (!t) return null

  const settings = mergeLegacySettings(t.settings)
  const firstRound = t.rounds[0]
  if (!firstRound) return null

  const participantCount = await prisma.legacyTournamentParticipant.count({
    where: { tournamentId: t.id },
  })

  const serializedShell: SerializedShell = {
    id: t.id,
    name: t.name,
    sport: t.sport,
    status: t.status,
    maxParticipants: settings.participantPoolSize,
    currentParticipantCount: participantCount,
    conferenceCount: t.conferences.length,
    leaguesPerConference: Math.max(1, Math.ceil(t.leagues.length / Math.max(1, t.conferences.length))),
    teamsPerLeague:
      typeof settings.initialLeagueSize === 'number' ? settings.initialLeagueSize : 12,
    namingMode: settings.leagueNamingMode,
    currentRoundNumber: firstRound.roundIndex + 1,
    totalRounds: Math.max(t.rounds.length, 1),
    advancersPerLeague: 1,
    wildcardCount: 0,
    bubbleEnabled: settings.bubbleWeekEnabled,
    bubbleSize: 8,
    bubbleScoringMode: 'cumulative_points',
    scoringSystem: 'ppr',
    draftType: settings.draftType,
    waiverType: 'faab',
    openingRosterSize: 15,
    tournamentRosterSize: settings.initialLeagueSize === 'auto' ? 12 : Number(settings.initialLeagueSize) || 12,
    eliteRosterSize: 8,
    faabResetOnRedraft: settings.faabResetByRound,
    draftClockSeconds: 90,
    simultaneousDrafts: true,
    tiebreakerMode: Array.isArray(settings.qualificationTiebreakers)
      ? String(settings.qualificationTiebreakers[0] ?? 'points_for')
      : 'points_for',
    standingsVisibility:
      settings.universalPageVisibility === 'public'
        ? 'all'
        : settings.universalPageVisibility === 'private'
          ? 'commissioner_only'
          : 'league_only',
  }

  const lp =
    userId != null
      ? await prisma.legacyTournamentParticipant.findUnique({
          where: { tournamentId_userId: { tournamentId: t.id, userId } },
        })
      : null

  let serializedParticipant: SerializedParticipant | null = null
  if (lp) {
    const appUser = await prisma.appUser.findUnique({
      where: { id: lp.userId },
      select: { displayName: true, username: true, email: true, avatarUrl: true },
    })
    const displayName =
      appUser?.displayName?.trim() ||
      appUser?.username?.trim() ||
      appUser?.email?.trim() ||
      'Manager'
    const leagueKey = lp.currentLeagueId ?? lp.qualificationLeagueId
    const tlForParticipant = leagueKey
      ? t.leagues.find((row) => row.leagueId === leagueKey)
      : null

    serializedParticipant = {
      id: lp.id,
      userId: lp.userId,
      displayName,
      avatarUrl: appUser?.avatarUrl ?? null,
      status: lp.status,
      currentRoundNumber: lp.advancedAtRoundIndex + 1,
      furthestRoundReached: lp.advancedAtRoundIndex + 1,
      currentConferenceId: lp.conferenceId,
      currentLeagueId: tlForParticipant?.id ?? null,
      careerWins: lp.qualificationWins,
      careerLosses: lp.qualificationLosses,
      careerPointsFor: lp.qualificationPointsFor,
      careerPointsAgainst: lp.qualificationPointsAgainst,
      advancementHistory: null,
    }
  }

  const legacyFeederLeagues: LegacyFeederLeagueRow[] = t.leagues.map((tl) => {
    const ls = (tl.league.settings as Record<string, unknown> | null) ?? {}
    const inviteCode = typeof ls.inviteCode === 'string' ? ls.inviteCode : ''
    const joinUrl = typeof ls.inviteLink === 'string' ? ls.inviteLink : ''
    return {
      tournamentLeagueId: tl.id,
      leagueId: tl.leagueId,
      name: tl.league.name ?? 'League',
      inviteCode,
      joinUrl,
      conferenceName: tl.conference.name,
    }
  })

  return {
    shell: serializedShell,
    conferences: t.conferences.map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: slugifySegment(c.name, `conf-${i}`),
      theme: c.theme,
      colorHex: null,
      conferenceNumber: c.orderIndex,
    })),
    rounds: t.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundIndex + 1,
      roundType: r.phase,
      roundLabel: r.name ?? `Round ${r.roundIndex + 1}`,
      weekStart: r.startWeek ?? 1,
      weekEnd: r.endWeek ?? 18,
      status: r.status,
    })),
    tournamentLeagues: t.leagues.map((tl) => ({
      id: tl.id,
      name: tl.league.name ?? 'League',
      slug: slugifySegment(tl.league.name ?? 'league', 'league'),
      roundId: firstRound.id,
      conferenceId: tl.conferenceId,
      leagueId: tl.leagueId,
      status: tl.phase,
      teamSlots: tl.league.leagueSize ?? 12,
      currentTeamCount: tl.league.teams.length,
      draftScheduledAt: null,
      colorHex: null,
      logoUrl: tl.league.logoUrl ?? tl.league.avatarUrl ?? null,
      advancersCount: 0,
    })),
    participant: serializedParticipant,
    isCommissioner: Boolean(userId && t.creatorId === userId),
    announcements: t.announcements.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title ?? '',
      content: a.body,
      roundNumber: null,
      createdAt: a.createdAt.toISOString(),
      isPosted: true,
    })),
    hubKind: 'legacy',
    legacyFeederLeagues,
  }
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

  if (!shell) {
    return loadLegacyTournamentLayoutPayload(tournamentId, userId)
  }

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
    hubKind: 'shell',
  }
}
