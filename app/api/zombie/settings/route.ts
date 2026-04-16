import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerOnly } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : null
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  await requireCommissionerOnly(leagueId, userId)

  const z = await prisma.zombieLeague.findUnique({ where: { leagueId } })
  if (!z) return NextResponse.json({ error: 'Zombie league not found' }, { status: 404 })

  const num = (k: string) => (typeof body[k] === 'number' ? (body[k] as number) : undefined)
  const bool = (k: string) => (typeof body[k] === 'boolean' ? (body[k] as boolean) : undefined)
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : undefined)

  const leaguePatch = {
    ...(str('name') !== undefined ? { name: str('name') } : {}),
    ...(str('status') !== undefined ? { status: str('status') } : {}),
    ...(num('teamCount') !== undefined ? { teamCount: num('teamCount') } : {}),
    ...(num('currentWeek') !== undefined ? { currentWeek: num('currentWeek') } : {}),
    ...(num('buyInAmount') !== undefined ? { buyInAmount: num('buyInAmount') } : {}),
    ...(bool('isPaid') !== undefined ? { isPaid: bool('isPaid') } : {}),
    ...(str('namingMode') !== undefined ? { namingMode: str('namingMode') } : {}),
    ...(str('whispererSelectionMode') !== undefined
      ? { whispererSelectionMode: str('whispererSelectionMode') }
      : {}),
    ...(bool('whispererIsPublic') !== undefined ? { whispererIsPublic: bool('whispererIsPublic') } : {}),
    ...(num('whispererAmbushCount') !== undefined ? { whispererAmbushCount: num('whispererAmbushCount') } : {}),
    ...(bool('weeklyPayoutEnabled') !== undefined ? { weeklyPayoutEnabled: bool('weeklyPayoutEnabled') } : {}),
    ...(bool('ultimateSurvivorPot') !== undefined ? { ultimateSurvivorPot: bool('ultimateSurvivorPot') } : {}),
    ...(num('weeklyUpdateDay') !== undefined ? { weeklyUpdateDay: num('weeklyUpdateDay') } : {}),
    ...(num('weeklyUpdateHour') !== undefined ? { weeklyUpdateHour: num('weeklyUpdateHour') } : {}),
    ...(bool('weeklyUpdateAutoPost') !== undefined ? { weeklyUpdateAutoPost: bool('weeklyUpdateAutoPost') } : {}),
    ...(bool('weeklyUpdateApproval') !== undefined ? { weeklyUpdateApproval: bool('weeklyUpdateApproval') } : {}),
    ...(bool('updateIncludeProjections') !== undefined
      ? { updateIncludeProjections: bool('updateIncludeProjections') }
      : {}),
    ...(bool('updateIncludeMoney') !== undefined ? { updateIncludeMoney: bool('updateIncludeMoney') } : {}),
    ...(bool('updateIncludeInventory') !== undefined ? { updateIncludeInventory: bool('updateIncludeInventory') } : {}),
    ...(bool('updateIncludeUniverse') !== undefined ? { updateIncludeUniverse: bool('updateIncludeUniverse') } : {}),
    ...(bool('updateIncludeDanger') !== undefined ? { updateIncludeDanger: bool('updateIncludeDanger') } : {}),
  }

  let row = await prisma.zombieLeague.update({
    where: { id: z.id },
    data: leaguePatch,
  })

  if (body.commissionerUiPrefs && typeof body.commissionerUiPrefs === 'object' && !Array.isArray(body.commissionerUiPrefs)) {
    const cur =
      z.commissionerUiPrefs && typeof z.commissionerUiPrefs === 'object' && !Array.isArray(z.commissionerUiPrefs)
        ? (z.commissionerUiPrefs as Record<string, unknown>)
        : {}
    const next = { ...cur, ...(body.commissionerUiPrefs as Record<string, unknown>) }
    row = await prisma.zombieLeague.update({
      where: { id: z.id },
      data: { commissionerUiPrefs: next as object },
    })
  }

  const configPatch = {
    ...(str('universeId') !== undefined ? { universeId: str('universeId') || null } : {}),
    ...(str('whispererSelection') !== undefined ? { whispererSelection: str('whispererSelection') } : {}),
    ...(bool('infectionLossToWhisperer') !== undefined
      ? { infectionLossToWhisperer: bool('infectionLossToWhisperer') }
      : {}),
    ...(bool('infectionLossToZombie') !== undefined ? { infectionLossToZombie: bool('infectionLossToZombie') } : {}),
    ...(num('serumReviveCount') !== undefined ? { serumReviveCount: num('serumReviveCount') } : {}),
    ...(bool('serumAwardHighScore') !== undefined ? { serumAwardHighScore: bool('serumAwardHighScore') } : {}),
    ...(bool('serumAwardOnBashMaul') !== undefined ? { serumAwardOnBashMaul: bool('serumAwardOnBashMaul') } : {}),
    ...(bool('serumUseBeforeLastStarter') !== undefined
      ? { serumUseBeforeLastStarter: bool('serumUseBeforeLastStarter') }
      : {}),
    ...(body.weaponScoreThresholds && typeof body.weaponScoreThresholds === 'object'
      ? { weaponScoreThresholds: body.weaponScoreThresholds }
      : {}),
    ...(bool('weaponTopTwoActive') !== undefined ? { weaponTopTwoActive: bool('weaponTopTwoActive') } : {}),
    ...(bool('bombOneTimeOverride') !== undefined ? { bombOneTimeOverride: bool('bombOneTimeOverride') } : {}),
    ...(num('ambushCountPerWeek') !== undefined ? { ambushCountPerWeek: num('ambushCountPerWeek') } : {}),
    ...(bool('ambushRemapMatchup') !== undefined ? { ambushRemapMatchup: bool('ambushRemapMatchup') } : {}),
    ...(bool('noWaiverFreeAgency') !== undefined ? { noWaiverFreeAgency: bool('noWaiverFreeAgency') } : {}),
    ...(bool('statCorrectionReversal') !== undefined ? { statCorrectionReversal: bool('statCorrectionReversal') } : {}),
    ...(bool('zombieTradeBlocked') !== undefined ? { zombieTradeBlocked: bool('zombieTradeBlocked') } : {}),
    ...(num('dangerousDropThreshold') !== undefined ? { dangerousDropThreshold: num('dangerousDropThreshold') } : {}),
  }

  let config = null
  if (Object.keys(configPatch).length > 0) {
    config = await prisma.zombieLeagueConfig.upsert({
      where: { leagueId },
      create: { leagueId, ...configPatch },
      update: configPatch,
    })
  } else {
    config = await prisma.zombieLeagueConfig.findUnique({ where: { leagueId } })
  }

  const paidPatch = {
    ...(num('buyInAmount') !== undefined ? { buyInAmount: num('buyInAmount') } : {}),
    ...(num('commissionerFeeRate') !== undefined ? { commissionerFeeRate: num('commissionerFeeRate') } : {}),
    ...(num('commissionerFeeCap') !== undefined ? { commissionerFeeCap: num('commissionerFeeCap') } : {}),
    ...(num('totalPot') !== undefined ? { totalPot: num('totalPot') } : {}),
    ...(num('weeklyPayoutPool') !== undefined ? { weeklyPayoutPool: num('weeklyPayoutPool') } : {}),
    ...(num('weeklyPayoutRate') !== undefined ? { weeklyPayoutRate: num('weeklyPayoutRate') } : {}),
    ...(num('seasonPayoutRate') !== undefined ? { seasonPayoutRate: num('seasonPayoutRate') } : {}),
    ...(num('survivorBonusRate') !== undefined ? { survivorBonusRate: num('survivorBonusRate') } : {}),
    ...(bool('ultimateSurvivorEnabled') !== undefined
      ? { ultimateSurvivorEnabled: bool('ultimateSurvivorEnabled') }
      : {}),
    ...(bool('potIsLocked') !== undefined ? { potIsLocked: bool('potIsLocked') } : {}),
  }

  let paidConfig = null
  if (Object.keys(paidPatch).length > 0) {
    paidConfig = await prisma.zombiePaidConfig.upsert({
      where: { zombieLeagueId: z.id },
      create: {
        zombieLeagueId: z.id,
        buyInAmount: num('buyInAmount') ?? z.buyInAmount ?? 0,
        paidUserIds: [],
        ...paidPatch,
      },
      update: paidPatch,
    })
  } else {
    paidConfig = await prisma.zombiePaidConfig.findUnique({ where: { zombieLeagueId: z.id } })
  }

  const freePatch = {
    ...(str('currencyLabel') !== undefined ? { currencyLabel: str('currencyLabel') } : {}),
    ...(str('weeklyWinLabel') !== undefined ? { weeklyWinLabel: str('weeklyWinLabel') } : {}),
    ...(str('seasonWinLabel') !== undefined ? { seasonWinLabel: str('seasonWinLabel') } : {}),
    ...(str('ultimatePotLabel') !== undefined ? { ultimatePotLabel: str('ultimatePotLabel') } : {}),
    ...(bool('badgesEnabled') !== undefined ? { badgesEnabled: bool('badgesEnabled') } : {}),
    ...(bool('achievementsEnabled') !== undefined ? { achievementsEnabled: bool('achievementsEnabled') } : {}),
  }

  let freeRewardConfig = null
  if (Object.keys(freePatch).length > 0) {
    freeRewardConfig = await prisma.zombieFreeRewardConfig.upsert({
      where: { zombieLeagueId: z.id },
      create: { zombieLeagueId: z.id, ...freePatch },
      update: freePatch,
    })
  } else {
    freeRewardConfig = await prisma.zombieFreeRewardConfig.findUnique({ where: { zombieLeagueId: z.id } })
  }

  return NextResponse.json({ zombieLeague: row, config, paidConfig, freeRewardConfig })
}
