/**
 * [NEW] lib/tournament-mode/TournamentCreationService.ts
 * Creates tournament parent, conferences, batch of feeder leagues, round records, and invite distribution.
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { runPostCreateInitialization } from '@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator'
import { buildLeagueInviteUrl } from '@/lib/viral-loop'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import {
  DEFAULT_TOURNAMENT_SETTINGS,
  TOURNAMENT_LEAGUE_VARIANT,
  BLACK_VS_GOLD_CONFERENCE_NAMES,
} from './constants'
import { generateLeagueNames, getConferenceDisplayNames, generateInviteCode } from './LeagueNamingService'
import type { CreateTournamentInput, TournamentSettings, InviteDistributionItem } from './types'

/** Compute number of leagues from participant pool and league size (or auto balance). */
export function computeLeagueCount(
  participantPoolSize: number,
  initialLeagueSize: number | 'auto'
): number {
  if (initialLeagueSize === 'auto') {
    if (participantPoolSize <= 60) return 6
    if (participantPoolSize <= 120) return 10
    if (participantPoolSize <= 180) return 15
    return 20
  }
  const size = Number(initialLeagueSize)
  if (!Number.isInteger(size) || size < 4) return Math.max(1, Math.floor(participantPoolSize / 10))
  return Math.max(1, Math.floor(participantPoolSize / size))
}

/**
 * Create full tournament: Tournament, 2 conferences, N leagues (with bootstrap), TournamentLeague links, rounds, invite codes.
 */
export async function createTournament(input: CreateTournamentInput): Promise<{
  tournamentId: string
  leagueIds: string[]
  inviteDistribution: InviteDistributionItem[]
  conferenceNames: [string, string]
}> {
  const sport = normalizeToSupportedSport(input.sport)
  const settings: TournamentSettings = {
    ...DEFAULT_TOURNAMENT_SETTINGS,
    ...input.settings,
  }
  const leagueCount = computeLeagueCount(settings.participantPoolSize, settings.initialLeagueSize)
  const perConference = Math.ceil(leagueCount / 2)
  const themeSeed = Date.now() % 1_000_000
  const [confA, confB] = getConferenceDisplayNames(
    settings.conferenceMode,
    input.conferenceNames,
    themeSeed
  )

  const tournament = await prisma.legacyTournament.create({
    data: {
      name: input.name.trim(),
      sport,
      season: input.season ?? new Date().getFullYear(),
      variant: input.variant ?? 'black_vs_gold',
      creatorId: input.creatorId,
      settings: settings as unknown as Record<string, unknown>,
      hubSettings: (input.hubSettings ?? {}) as unknown as Record<string, unknown>,
      status: 'qualification',
    },
  })

  const confARow = await prisma.legacyTournamentConference.create({
    data: {
      tournamentId: tournament.id,
      name: confA,
      theme: settings.conferenceMode === 'black_vs_gold' ? 'black' : 'custom',
      orderIndex: 0,
    },
  })
  const confBRow = await prisma.legacyTournamentConference.create({
    data: {
      tournamentId: tournament.id,
      name: confB,
      theme: settings.conferenceMode === 'black_vs_gold' ? 'gold' : 'custom',
      orderIndex: 1,
    },
  })

  const leagueNames = generateLeagueNames(
    leagueCount,
    settings.leagueNamingMode,
    settings.conferenceMode,
    0,
    input.leagueNames,
    themeSeed
  )

  const inviteDistribution: InviteDistributionItem[] = []
  const leagueIds: string[] = []

  for (let i = 0; i < leagueCount; i++) {
    const conference = i < perConference ? confARow : confBRow
    const conferenceName = i < perConference ? confA : confB
    const leagueName = leagueNames[i] ?? `League ${i + 1}`

    const league = await prisma.league.create({
      data: {
        userId: input.creatorId,
        name: leagueName,
        platform: 'manual',
        platformLeagueId: `tournament-${tournament.id}-${i}-${Date.now()}`,
        leagueSize: typeof settings.initialLeagueSize === 'number' ? settings.initialLeagueSize : 12,
        scoring: 'PPR',
        isDynasty: false,
        sport,
        leagueVariant: TOURNAMENT_LEAGUE_VARIANT,
        settings: {
          tournamentId: tournament.id,
          tournamentName: input.name,
          conferenceName,
          roundIndex: 0,
          phase: 'qualification',
        },
        syncStatus: 'manual',
      },
    })
    leagueIds.push(league.id)

    try {
      await runPostCreateInitialization(league.id, sport, TOURNAMENT_LEAGUE_VARIANT)
    } catch (err) {
      console.warn('[tournament-mode] Bootstrap non-fatal for league', league.id, err)
    }

    const orderInConference = i < perConference ? i : i - perConference
    await prisma.legacyTournamentLeague.create({
      data: {
        tournamentId: tournament.id,
        conferenceId: conference.id,
        leagueId: league.id,
        roundIndex: 0,
        phase: 'qualification',
        orderInConference,
      },
    })

    const inviteCode = generateInviteCode()
    const joinUrl = buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'tournament_invite' } })
    const currentSettings = (league.settings as Record<string, unknown>) ?? {}
    await prisma.league.update({
      where: { id: league.id },
      data: {
        settings: { ...currentSettings, inviteCode, inviteLink: joinUrl },
      },
    })

    inviteDistribution.push({
      leagueId: league.id,
      leagueName: league.name ?? leagueName,
      conferenceName,
      inviteCode,
      joinUrl,
    })
  }

  await prisma.legacyTournamentRound.create({
    data: {
      tournamentId: tournament.id,
      roundIndex: 0,
      phase: 'qualification',
      name: 'Qualification',
      startWeek: 1,
      endWeek: settings.qualificationWeeks,
      status: 'pending',
      settings: {
        qualificationWeeks: settings.qualificationWeeks,
        advancementCount: null,
        benchSpots: settings.benchSpotsQualification,
        faabBudget: settings.faabBudgetDefault,
      },
    },
  })

  return {
    tournamentId: tournament.id,
    leagueIds,
    inviteDistribution,
    conferenceNames: [confA, confB],
  }
}
