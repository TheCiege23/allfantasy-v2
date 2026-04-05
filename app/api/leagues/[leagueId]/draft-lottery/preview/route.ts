/**
 * POST: Preview weighted lottery odds (any league member). Body: { config?: Partial<WeightedLotteryConfig> }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'
import { getDraftOrderModeAndLotteryConfig } from '@/lib/draft-lottery/lotteryConfigStorage'
import { previewLotteryOdds } from '@/lib/draft-lottery/WeightedDraftLotteryEngine'
import { checkDynastyLotteryEligibility } from '@/lib/draft-lottery/dynastyYearGuard'
import type { WeightedLotteryConfig } from '@/lib/draft-lottery/types'
import { getStandingsForLottery } from '@/lib/draft-lottery/standingsForLottery'

export const dynamic = 'force-dynamic'

export async function POST(
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

  const lotteryEligibility = await checkDynastyLotteryEligibility(leagueId)
  if (!lotteryEligibility.eligible) {
    return NextResponse.json({ error: lotteryEligibility.reason }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { config?: Partial<WeightedLotteryConfig> }
  const { lotteryConfig: base } = await getDraftOrderModeAndLotteryConfig(leagueId)
  const merged: WeightedLotteryConfig = {
    ...base,
    ...(body.config ?? {}),
    enabled: true,
  }

  const [result, leagueRow, standings] = await Promise.all([
    previewLotteryOdds(leagueId, merged),
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { leagueSize: true },
    }),
    getStandingsForLottery(leagueId),
  ])

  if (!result) return NextResponse.json({ error: 'Could not load standings' }, { status: 500 })

  const totalTeams = leagueRow?.leagueSize ?? standings.length

  return NextResponse.json({
    eligible: result.eligible,
    playoffTeamCount: result.playoffTeamCount,
    totalTeams,
    message: result.message,
  })
}
