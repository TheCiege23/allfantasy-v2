/**
 * GET: Weighted lottery result for a cap year. Returns 404 when not salary cap or no result.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isSalaryCapLeague } from '@/lib/salary-cap/SalaryCapLeagueConfig'
import { getLotteryResult } from '@/lib/salary-cap/WeightedLotteryService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; capYear: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, capYear: capYearParam } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isCap = await isSalaryCapLeague(leagueId)
  if (!isCap) return NextResponse.json({ error: 'Not a salary cap league' }, { status: 404 })

  const capYear = parseInt(capYearParam, 10)
  if (!Number.isInteger(capYear) || capYear < 2020) {
    return NextResponse.json({ error: 'Invalid capYear' }, { status: 400 })
  }

  const result = await getLotteryResult(leagueId, capYear)
  if (!result) return NextResponse.json({ error: 'No lottery result for this year' }, { status: 404 })
  return NextResponse.json({ capYear, order: result.order, seed: result.seed })
}
