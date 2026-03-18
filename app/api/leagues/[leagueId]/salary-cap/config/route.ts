/**
 * GET: Salary Cap league config. Returns 404 when not a salary cap league. PROMPT 339.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isSalaryCapLeague, getSalaryCapConfig } from '@/lib/salary-cap/SalaryCapLeagueConfig'

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

  const isCap = await isSalaryCapLeague(leagueId)
  if (!isCap) return NextResponse.json({ error: 'Not a salary cap league' }, { status: 404 })

  const config = await getSalaryCapConfig(leagueId)
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  return NextResponse.json({
    leagueId: config.leagueId,
    mode: config.mode,
    startupCap: config.startupCap,
    capGrowthPercent: config.capGrowthPercent,
    contractMinYears: config.contractMinYears,
    contractMaxYears: config.contractMaxYears,
    rookieContractYears: config.rookieContractYears,
    minimumSalary: config.minimumSalary,
    deadMoneyEnabled: config.deadMoneyEnabled,
    deadMoneyPercentPerYear: config.deadMoneyPercentPerYear,
    rolloverEnabled: config.rolloverEnabled,
    rolloverMax: config.rolloverMax,
    capFloorEnabled: config.capFloorEnabled,
    capFloorAmount: config.capFloorAmount,
    extensionsEnabled: config.extensionsEnabled,
    franchiseTagEnabled: config.franchiseTagEnabled,
    rookieOptionEnabled: config.rookieOptionEnabled,
    startupDraftType: config.startupDraftType,
    futureDraftType: config.futureDraftType,
    auctionHoldback: config.auctionHoldback,
    weightedLotteryEnabled: config.weightedLotteryEnabled,
    lotteryOddsConfig: config.lotteryOddsConfig,
    compPickEnabled: config.compPickEnabled,
    compPickFormula: config.compPickFormula,
    offseasonPhase: config.offseasonPhase,
    offseasonPhaseEndsAt: config.offseasonPhaseEndsAt,
  })
}
