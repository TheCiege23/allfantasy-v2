/**
 * [NEW] GET: Big Brother league home summary (cycle, phase, HOH, nominees, veto, ballot, jury, eliminated, timeline).
 * PROMPT 4.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { isBigBrotherLeague, getBigBrotherConfig } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { getCurrentCycleForLeague } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { getEligibility } from '@/lib/big-brother/BigBrotherEligibilityEngine'
import { getFinalNomineeRosterIds } from '@/lib/big-brother/BigBrotherNominationEngine'
import { getJuryMembers } from '@/lib/big-brother/BigBrotherJuryEngine'
import { getRosterDisplayNamesForLeague } from '@/lib/big-brother/ai/getRosterDisplayNames'
import { getBigBrotherSportCalendarContext } from '@/lib/big-brother/BigBrotherSportCalendar'
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

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const [config, current, myRosterId, totalRosterCount] = await Promise.all([
    getBigBrotherConfig(leagueId),
    getCurrentCycleForLeague(leagueId),
    getCurrentUserRosterIdForLeague(leagueId, userId),
    prisma.roster.count({ where: { leagueId } }),
  ])

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  let cycle: {
    id: string
    week: number
    phase: string
    hohRosterId: string | null
    nominee1RosterId: string | null
    nominee2RosterId: string | null
    vetoWinnerRosterId: string | null
    vetoParticipantRosterIds: string[] | null
    vetoUsed: boolean
    vetoSavedRosterId: string | null
    replacementNomineeRosterId: string | null
    evictedRosterId: string | null
    voteDeadlineAt: string | null
    voteOpenedAt: string | null
    closedAt: string | null
  } | null = null

  let finalNomineeRosterIds: string[] = []
  let eligibility: Awaited<ReturnType<typeof getEligibility>> = null
  let jury: { rosterId: string; evictedWeek: number }[] = []
  let ballot: { canVote: boolean; voteDeadlineAt: string | null; closed: boolean } | null = null

  if (current) {
    const cycleRow = await prisma.bigBrotherCycle.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        week: true,
        phase: true,
        hohRosterId: true,
        nominee1RosterId: true,
        nominee2RosterId: true,
        vetoWinnerRosterId: true,
        vetoParticipantRosterIds: true,
        vetoUsed: true,
        vetoSavedRosterId: true,
        replacementNomineeRosterId: true,
        evictedRosterId: true,
        voteDeadlineAt: true,
        voteOpenedAt: true,
        closedAt: true,
      },
    })
    if (cycleRow) {
      cycle = {
        ...cycleRow,
        voteDeadlineAt: cycleRow.voteDeadlineAt?.toISOString() ?? null,
        voteOpenedAt: cycleRow.voteOpenedAt?.toISOString() ?? null,
        closedAt: cycleRow.closedAt?.toISOString() ?? null,
        vetoParticipantRosterIds: cycleRow.vetoParticipantRosterIds as string[] | null,
      }
      finalNomineeRosterIds = await getFinalNomineeRosterIds(current.id)
    }
    eligibility = await getEligibility(leagueId, { cycleId: current.id })
    jury = await getJuryMembers(leagueId)

    if (cycle && myRosterId) {
      const canVote = eligibility?.canVote.includes(myRosterId) ?? false
      ballot = {
        canVote,
        voteDeadlineAt: cycle.voteDeadlineAt,
        closed: !!cycle.closedAt,
      }
    }
  }

  const eliminatedRosterIds = eligibility?.eliminatedRosterIds ?? []
  const allRosterIds = [
    cycle?.hohRosterId,
    cycle?.nominee1RosterId,
    cycle?.nominee2RosterId,
    cycle?.vetoWinnerRosterId,
    cycle?.replacementNomineeRosterId,
    cycle?.evictedRosterId,
    ...(cycle?.vetoParticipantRosterIds ?? []),
    ...finalNomineeRosterIds,
    ...jury.map((j) => j.rosterId),
    ...eliminatedRosterIds,
  ].filter(Boolean) as string[]
  const rosterDisplayNames = await getRosterDisplayNamesForLeague(leagueId, [...new Set(allRosterIds)])

  const myStatus = myRosterId
    ? (() => {
        if (eliminatedRosterIds.includes(myRosterId))
          return jury.some((j) => j.rosterId === myRosterId) ? 'JURY' : 'ELIMINATED'
        if (cycle?.hohRosterId === myRosterId) return 'HOH'
        if (finalNomineeRosterIds.includes(myRosterId)) return 'NOMINATED'
        if (cycle?.vetoWinnerRosterId === myRosterId) return 'VETO_WINNER'
        if (cycle?.vetoParticipantRosterIds?.includes(myRosterId)) return 'VETO_PLAYER'
        return 'SAFE'
      })()
    : null

  const eliminatedCount = eliminatedRosterIds.length
  const remainingCount = totalRosterCount - eliminatedCount

  const sportCalendar = await getBigBrotherSportCalendarContext(config.sport)

  return NextResponse.json({
    totalRosterCount,
    remainingCount,
    config: {
      sport: config.sport,
      finaleFormat: config.finaleFormat,
      juryStartMode: config.juryStartMode,
    },
    sportCalendar: {
      regularSeasonWeeks: sportCalendar.regularSeasonWeeks,
      evictionEndWeek: sportCalendar.evictionEndWeek,
      scoringWindowDisclaimer: sportCalendar.scoringWindowDisclaimer,
      timelineNote: sportCalendar.timelineNote,
    },
    cycle,
    finalNomineeRosterIds,
    eligibility: eligibility
      ? {
          canCompeteHOH: eligibility.canCompeteHOH,
          canBeNominated: eligibility.canBeNominated,
          canVote: eligibility.canVote,
          juryRosterIds: eligibility.juryRosterIds,
          eliminatedRosterIds: eligibility.eliminatedRosterIds,
        }
      : null,
    jury,
    ballot,
    myRosterId,
    myStatus,
    rosterDisplayNames,
  })
}
