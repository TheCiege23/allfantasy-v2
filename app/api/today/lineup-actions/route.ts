import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { shouldRunLineupShadow, runLineupShadowForSummary } from '@/lib/decision-os/lineup/shadow'
import { getDecisionShadowScopeFilters } from '@/lib/decision-os/core/shadow'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await computeLineupActionsForUser(userId)
  const withChimmy = await attachChimmyAdviceToLineupSummary(summary, userId)
  const intelligence = {
    schemaVersion: 1 as const,
    time: await buildAiTimeContextPayload(userId),
  }
  const shadowFilters = getDecisionShadowScopeFilters()
  const shadowProfile = shadowFilters.hasUsernameFilter
    ? await prisma.userProfile.findUnique({
        where: { userId },
        select: { sleeperUsername: true },
      })
    : null

  // Decision OS Slice 1 — SHADOW ONLY (DECISION_OS_LINEUP_SHADOW=true). Runs the new
  // manager.lineup.set path beside legacy, logs decision parity AND canonical-validator parity
  // (primary vs rosterValidationService), and can NEVER alter or break this response.
  if (shouldRunLineupShadow(process.env, {
    username: shadowProfile?.sleeperUsername ?? null,
    leagueIds: (summary.leagues ?? []).map((league) => league.leagueId),
  })) {
    try {
      await runLineupShadowForSummary(userId, summary, { maxLeagues: 1 })
    } catch {
      // shadow must never affect the legacy response
    }
  }

  return NextResponse.json({ ...withChimmy, intelligence })
}
