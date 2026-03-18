/**
 * GET: Survivor league home summary (tribes, council, challenges, exile, jury, audit). PROMPT 347.
 * Returns 404 when league is not a survivor league.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { isSurvivorLeague, getSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'
import { getTribesWithMembers } from '@/lib/survivor/SurvivorTribeService'
import { getCouncil } from '@/lib/survivor/SurvivorTribalCouncilService'
import { getChallengesForWeek } from '@/lib/survivor/SurvivorChallengeEngine'
import { getJuryMembers } from '@/lib/survivor/SurvivorJuryEngine'
import { getExileLeagueId } from '@/lib/survivor/SurvivorExileEngine'
import { getAllTokenStates } from '@/lib/survivor/SurvivorTokenEngine'
import { getActiveIdolsForRoster } from '@/lib/survivor/SurvivorIdolRegistry'
import { getSurvivorAuditLog } from '@/lib/survivor/SurvivorAuditLog'
import { isMergeTriggered } from '@/lib/survivor/SurvivorMergeEngine'
import { getRosterTeamMap } from '@/lib/zombie/rosterTeamMap'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return NextResponse.json({ error: 'Not a survivor league' }, { status: 404 })

  const weekParam = req.nextUrl.searchParams.get('week')
  const currentWeek = weekParam ? Math.max(1, parseInt(weekParam, 10)) || 1 : 1

  const [config, tribes, council, challenges, jury, exileLeagueId, tokenStates, audit, merged, myRosterId] = await Promise.all([
    getSurvivorConfig(leagueId),
    getTribesWithMembers(leagueId),
    getCouncil(leagueId, currentWeek),
    getChallengesForWeek(leagueId, currentWeek),
    getJuryMembers(leagueId),
    getExileLeagueId(leagueId),
    getExileLeagueId(leagueId).then((id) => (id ? getAllTokenStates(id) : [])),
    getSurvivorAuditLog(leagueId, { limit: 50, eventTypes: ['eliminated', 'council_closed', 'exile_enrolled', 'jury_joined'] }),
    isMergeTriggered(leagueId, currentWeek),
    getCurrentUserRosterIdForLeague(leagueId, userId),
  ])

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  const votedOutHistory = audit
    .filter((e) => e.eventType === 'eliminated')
    .map((e) => (e.metadata as { rosterId?: string; week?: number }) ?? {})
    .filter((m) => m.rosterId)

  const rosterIds = new Set<string>([
    ...tribes.flatMap((t) => t.members.map((m) => m.rosterId)),
    ...jury.map((j) => j.rosterId),
    ...votedOutHistory.map((v) => v.rosterId!).filter(Boolean),
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

  return NextResponse.json({
    config: {
      mode: config.mode,
      tribeCount: config.tribeCount,
      tribeSize: config.tribeSize,
      mergeTrigger: config.mergeTrigger,
      mergeWeek: config.mergeWeek,
      mergePlayerCount: config.mergePlayerCount,
      juryStartAfterMerge: config.juryStartAfterMerge,
      exileReturnEnabled: config.exileReturnEnabled,
      exileReturnTokens: config.exileReturnTokens,
      voteDeadlineDayOfWeek: config.voteDeadlineDayOfWeek,
      voteDeadlineTimeUtc: config.voteDeadlineTimeUtc,
      selfVoteDisallowed: config.selfVoteDisallowed,
    },
    currentWeek,
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
    myRosterId: myRosterId ?? undefined,
    myIdols,
    rosterDisplayNames,
  })
}
