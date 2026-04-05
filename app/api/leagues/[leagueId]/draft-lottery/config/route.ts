/**
 * GET: Current draft order mode + weighted lottery config (league members).
 * PUT: Update lottery config (commissioner only, year 2+ dynasty guard on mode changes).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import {
  getDraftOrderModeAndLotteryConfig,
  setDraftOrderModeAndLotteryConfig,
} from '@/lib/draft-lottery/lotteryConfigStorage'
import { checkDynastyLotteryEligibility } from '@/lib/draft-lottery/dynastyYearGuard'
import type { DraftOrderMode, WeightedLotteryConfig } from '@/lib/draft-lottery/types'

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

  const [lotteryEligibility, order] = await Promise.all([
    checkDynastyLotteryEligibility(leagueId),
    getDraftOrderModeAndLotteryConfig(leagueId),
  ])

  return NextResponse.json({
    lotteryEligibility: {
      eligible: lotteryEligibility.eligible,
      reason: lotteryEligibility.reason,
      isStartupLeague: lotteryEligibility.isStartupLeague,
    },
    draftOrderMode: order.draftOrderMode,
    lotteryConfig: order.lotteryConfig,
    lotteryLastSeed: order.lotteryLastSeed,
    lotteryLastRunAt: order.lotteryLastRunAt,
    lotteryLastResult: order.lotteryLastResult,
  })
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const commissioner = await isCommissioner(leagueId, userId)
  if (!commissioner) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const lotteryEligibility = await checkDynastyLotteryEligibility(leagueId)
  if (!lotteryEligibility.eligible) {
    return NextResponse.json({ error: lotteryEligibility.reason }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    draftOrderMode?: DraftOrderMode
    lotteryConfig?: Partial<WeightedLotteryConfig>
  }

  await setDraftOrderModeAndLotteryConfig(leagueId, {
    ...(body.draftOrderMode !== undefined ? { draftOrderMode: body.draftOrderMode } : {}),
    ...(body.lotteryConfig !== undefined ? { lotteryConfig: body.lotteryConfig } : {}),
  })

  const next = await getDraftOrderModeAndLotteryConfig(leagueId)
  return NextResponse.json({ ok: true, ...next })
}
