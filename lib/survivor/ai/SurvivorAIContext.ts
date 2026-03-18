/**
 * Build deterministic context for Survivor AI. NO outcome logic — only data for narration/advice.
 * PROMPT 348: Elimination, vote count, idol validity, immunity, exile return are rules-driven only.
 */

import { getSurvivorConfig } from '../SurvivorLeagueConfig'
import { getTribesWithMembers } from '../SurvivorTribeService'
import { getCouncil } from '../SurvivorTribalCouncilService'
import { getChallengesForWeek } from '../SurvivorChallengeEngine'
import { getJuryMembers } from '../SurvivorJuryEngine'
import { getExileLeagueId } from '../SurvivorExileEngine'
import { getAllTokenStates } from '../SurvivorTokenEngine'
import { getActiveIdolsForRoster } from '../SurvivorIdolRegistry'
import { getSurvivorAuditLog } from '../SurvivorAuditLog'
import { isMergeTriggered } from '../SurvivorMergeEngine'
import { getRosterTeamMap } from '@/lib/zombie/rosterTeamMap'
import { prisma } from '@/lib/prisma'
import type { LeagueSport } from '@prisma/client'

export type SurvivorAIType =
  | 'host_intro'
  | 'host_challenge'
  | 'host_merge'
  | 'host_council'
  | 'host_scroll'
  | 'host_jury'
  | 'tribe_help'
  | 'idol_help'
  | 'tribal_help'
  | 'exile_help'
  | 'bestball_help'

export interface SurvivorAIDeterministicContext {
  leagueId: string
  sport: LeagueSport
  currentWeek: number
  config: {
    mode: string
    tribeCount: number
    tribeSize: number
    mergeTrigger: string
    mergeWeek: number
    mergePlayerCount: number | null
    juryStartAfterMerge: boolean
    exileReturnEnabled: boolean
    exileReturnTokens: number
    voteDeadlineDayOfWeek: number | null
    voteDeadlineTimeUtc: string | null
    selfVoteDisallowed: boolean
  }
  tribes: { id: string; name: string; slotIndex: number; members: { rosterId: string; isLeader: boolean }[] }[]
  council: {
    id: string
    week: number
    phase: string
    attendingTribeId: string | null
    voteDeadlineAt: Date
    closedAt: Date | null
    eliminatedRosterId: string | null
  } | null
  challenges: { id: string; week: number; challengeType: string; lockAt: Date | null; resultJson: unknown; submissionCount: number }[]
  jury: { rosterId: string; votedOutWeek: number }[]
  exileLeagueId: string | null
  exileTokens: { rosterId: string; tokens: number; lastAwardedWeek: number | null }[]
  votedOutHistory: { rosterId: string; week: number }[]
  merged: boolean
  rosterDisplayNames: Record<string, string>
  myRosterId: string | null
  myIdols: { id: string; playerId: string; powerType: string }[]
}

/**
 * Build deterministic context for Survivor AI. Used by AI layer for narration and advice only.
 */
export async function buildSurvivorAIContext(args: {
  leagueId: string
  currentWeek: number
  userId: string
}): Promise<SurvivorAIDeterministicContext | null> {
  const { leagueId, currentWeek, userId } = args
  const config = await getSurvivorConfig(leagueId)
  if (!config) return null

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport = (league?.sport ?? 'NFL') as LeagueSport

  const [tribes, council, challenges, jury, exileLeagueId, tokenStates, audit, merged, myRosterId] = await Promise.all([
    getTribesWithMembers(leagueId),
    getCouncil(leagueId, currentWeek),
    getChallengesForWeek(leagueId, currentWeek),
    getJuryMembers(leagueId),
    getExileLeagueId(leagueId),
    getExileLeagueId(leagueId).then((id) => (id ? getAllTokenStates(id) : [])),
    getSurvivorAuditLog(leagueId, { limit: 50, eventTypes: ['eliminated'] }),
    isMergeTriggered(leagueId, currentWeek),
    prisma.roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }).then((r) => r?.id ?? null),
  ])

  const votedOutHistory = audit
    .filter((e) => e.eventType === 'eliminated')
    .map((e) => (e.metadata as { rosterId?: string; week?: number }) ?? {})
    .filter((m): m is { rosterId: string; week: number } => Boolean(m.rosterId && typeof m.week === 'number'))

  const rosterIds = new Set<string>([
    ...tribes.flatMap((t) => t.members.map((m) => m.rosterId)),
    ...jury.map((j) => j.rosterId),
    ...votedOutHistory.map((v) => v.rosterId),
  ])
  const rosters =
    rosterIds.size > 0
      ? await prisma.roster.findMany({
          where: { leagueId, id: { in: [...rosterIds] } },
          select: { id: true },
        })
      : []
  const map = await getRosterTeamMap(leagueId)
  const teamIds = [...new Set(rosters.map((r) => map.rosterIdToTeamId.get(r.id)).filter((id): id is string => id != null))]
  const teams =
    teamIds.length > 0
      ? await prisma.leagueTeam.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, teamName: true },
        })
      : []
  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.teamName ?? t.id]))
  const rosterDisplayNames: Record<string, string> = {}
  for (const r of rosters) {
    const teamId = map.rosterIdToTeamId.get(r.id)
    rosterDisplayNames[r.id] = teamId ? teamNameById[teamId] ?? r.id : r.id
  }

  let myIdols: { id: string; playerId: string; powerType: string }[] = []
  if (myRosterId) {
    myIdols = await getActiveIdolsForRoster(leagueId, myRosterId)
  }

  return {
    leagueId,
    sport,
    currentWeek,
    config: {
      mode: config.mode,
      tribeCount: config.tribeCount,
      tribeSize: config.tribeSize,
      mergeTrigger: config.mergeTrigger,
      mergeWeek: config.mergeWeek ?? 0,
      mergePlayerCount: config.mergePlayerCount,
      juryStartAfterMerge: config.juryStartAfterMerge === 1,
      exileReturnEnabled: config.exileReturnEnabled,
      exileReturnTokens: config.exileReturnTokens,
      voteDeadlineDayOfWeek: config.voteDeadlineDayOfWeek,
      voteDeadlineTimeUtc: config.voteDeadlineTimeUtc,
      selfVoteDisallowed: config.selfVoteDisallowed,
    },
    tribes: tribes.map((t) => ({
      id: t.id,
      name: t.name,
      slotIndex: t.slotIndex,
      members: t.members.map((m) => ({ rosterId: m.rosterId, isLeader: m.isLeader })),
    })),
    council: council
      ? {
          id: council.id,
          week: council.week,
          phase: council.phase,
          attendingTribeId: council.attendingTribeId,
          voteDeadlineAt: council.voteDeadlineAt,
          closedAt: council.closedAt,
          eliminatedRosterId: council.eliminatedRosterId,
        }
      : null,
    challenges: challenges.map((c) => ({
      id: c.id,
      week: c.week,
      challengeType: c.challengeType,
      lockAt: c.lockAt,
      resultJson: c.resultJson,
      submissionCount: c.submissions?.length ?? 0,
    })),
    jury: jury.map((j) => ({ rosterId: j.rosterId, votedOutWeek: j.votedOutWeek })),
    exileLeagueId,
    exileTokens: tokenStates,
    votedOutHistory,
    merged,
    rosterDisplayNames,
    myRosterId,
    myIdols,
  }
}
