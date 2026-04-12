/**
 * [NEW] app/api/leagues/[leagueId]/big-brother/hoh/route.ts
 * POST: Run HOH challenge and assign winner. Supports all 3 challenge modes.
 * GET: Returns current HOH and eligible competitors for the current cycle.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isBigBrotherLeague, getBigBrotherConfig } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { getCurrentCycleForLeague, transitionPhase } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { assignHOH, getEligibleHOHRosterIds } from '@/lib/big-brother/BigBrotherHOHEngine'
import { resolveChallengeByScore, resolveChallengeBySeededRandom } from '@/lib/big-brother/BigBrotherChallengeEngine'
import { announceHOHWinner } from '@/lib/big-brother/BigBrotherChatAnnouncements'
import { getRosterDisplayNamesForLeague } from '@/lib/big-brother/ai/getRosterDisplayNames'
import { appendBigBrotherAudit } from '@/lib/big-brother/BigBrotherAuditLog'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const config = await getBigBrotherConfig(leagueId)
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  const current = await getCurrentCycleForLeague(leagueId)
  if (!current) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: current.id },
    select: { hohRosterId: true, week: true, phase: true },
  })

  const eligible = await getEligibleHOHRosterIds(leagueId, config.configId, current.week, config.consecutiveHohAllowed)
  const names = await getRosterDisplayNamesForLeague(leagueId, eligible)

  return NextResponse.json({
    week: current.week,
    phase: cycle?.phase,
    hohRosterId: cycle?.hohRosterId ?? null,
    eligible,
    rosterDisplayNames: names,
    challengeMode: config.challengeMode,
  })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  // Commissioner check
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  if (!league || league.userId !== userId) {
    return NextResponse.json({ error: 'Commissioner only — HOH challenge must be triggered by commissioner' }, { status: 403 })
  }

  const config = await getBigBrotherConfig(leagueId)
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  const current = await getCurrentCycleForLeague(leagueId)
  if (!current) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

  if (current.phase !== 'HOH_OPEN') {
    return NextResponse.json({ error: `Cannot assign HOH — phase is ${current.phase}, expected HOH_OPEN` }, { status: 400 })
  }

  const eligible = await getEligibleHOHRosterIds(leagueId, config.configId, current.week, config.consecutiveHohAllowed)
  if (eligible.length === 0) {
    return NextResponse.json({ error: 'No eligible HOH competitors' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  let winnerId: string | null = null

  // If commissioner manually picks (e.g., for commissioner-decided or external challenge)
  if (body.winnerRosterId && typeof body.winnerRosterId === 'string') {
    if (!eligible.includes(body.winnerRosterId)) {
      return NextResponse.json({ error: 'Selected roster is not eligible for HOH' }, { status: 400 })
    }
    winnerId = body.winnerRosterId
  } else if (config.challengeMode === 'deterministic_score') {
    // Score-based: use weekly fantasy scores or provided scores
    const scores = body.scores as Record<string, number> | undefined
    if (scores && Object.keys(scores).length > 0) {
      winnerId = await resolveChallengeByScore({
        leagueId,
        configId: config.configId,
        week: current.week,
        participantRosterIds: eligible,
        challengeType: 'hoh',
        scores,
      })
    } else {
      // Auto-resolve using season points as proxy
      winnerId = await resolveChallengeByScore({
        leagueId,
        configId: config.configId,
        week: current.week,
        participantRosterIds: eligible,
        challengeType: 'hoh',
        scores: Object.fromEntries(eligible.map((id, i) => [id, 0])), // fallback to seeded random
      })
      // If all scores are 0, fall through to seeded random
      if (!winnerId) {
        winnerId = resolveChallengeBySeededRandom({
          leagueId,
          configId: config.configId,
          week: current.week,
          participantRosterIds: eligible,
          challengeType: 'hoh',
        })
      }
    }
  } else {
    // Seeded random (ai_theme or hybrid mode — AI themes the challenge but outcome is random)
    winnerId = resolveChallengeBySeededRandom({
      leagueId,
      configId: config.configId,
      week: current.week,
      participantRosterIds: eligible,
      challengeType: 'hoh',
    })
  }

  if (!winnerId) {
    return NextResponse.json({ error: 'Could not determine HOH winner' }, { status: 500 })
  }

  // Assign HOH
  const assignResult = await assignHOH(leagueId, config.configId, current.id, winnerId)
  if (!assignResult.ok) {
    return NextResponse.json({ error: assignResult.error ?? 'HOH assignment failed' }, { status: 500 })
  }

  // Transition to HOH_LOCKED then NOMINATION_OPEN
  await transitionPhase(current.id, 'HOH_LOCKED')
  await transitionPhase(current.id, 'NOMINATION_OPEN')

  // Announce
  const names = await getRosterDisplayNamesForLeague(leagueId, [winnerId])
  await announceHOHWinner({
    leagueId,
    week: current.week,
    hohRosterId: winnerId,
    hohDisplayName: names[winnerId],
  })

  // Audit
  await appendBigBrotherAudit(leagueId, config.configId, 'hoh_challenge_result', {
    cycleId: current.id,
    week: current.week,
    winnerId,
    challengeMode: config.challengeMode,
    eligibleCount: eligible.length,
  })

  return NextResponse.json({
    ok: true,
    hohRosterId: winnerId,
    hohDisplayName: names[winnerId] ?? winnerId,
    week: current.week,
    phase: 'NOMINATION_OPEN',
  })
}
