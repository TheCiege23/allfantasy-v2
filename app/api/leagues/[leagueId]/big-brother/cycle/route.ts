/**
 * [NEW] GET: Current Big Brother cycle and phase (state machine). PROMPT 3.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { getCurrentCycleForLeague } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { getEligibility } from '@/lib/big-brother/BigBrotherEligibilityEngine'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
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

  const current = await getCurrentCycleForLeague(leagueId)
  if (!current) return NextResponse.json({ cycle: null })

  const eligibility = await getEligibility(leagueId, { cycleId: current.id })

  return NextResponse.json({
    cycle: {
      id: current.id,
      week: current.week,
      phase: current.phase,
    },
    eligibility: eligibility
      ? {
          canCompeteHOH: eligibility.canCompeteHOH,
          canBeNominated: eligibility.canBeNominated,
          canVote: eligibility.canVote,
          juryRosterIds: eligibility.juryRosterIds,
          eliminatedRosterIds: eligibility.eliminatedRosterIds,
        }
      : null,
  })
}
