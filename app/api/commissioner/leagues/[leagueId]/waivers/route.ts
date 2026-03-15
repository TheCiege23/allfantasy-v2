import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getEffectiveLeagueWaiverSettings, upsertLeagueWaiverSettings } from '@/lib/waiver-wire'
import { getPendingClaims, getProcessedClaimsAndTransactions } from '@/lib/waiver-wire'
import { processWaiverClaimsForLeague } from '@/lib/waiver-wire'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const type = req.nextUrl.searchParams.get('type') || 'pending'
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '50')))

  if (type === 'settings') {
    const settings = await getEffectiveLeagueWaiverSettings(params.leagueId)
    return NextResponse.json(settings)
  }

  if (type === 'history') {
    const { claims, transactions } = await getProcessedClaimsAndTransactions(params.leagueId, limit)
    return NextResponse.json({ claims, transactions })
  }

  const pending = await getPendingClaims(params.leagueId)
  return NextResponse.json({ claims: pending })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const settings = await upsertLeagueWaiverSettings(params.leagueId, {
    waiverType: body.waiverType ?? 'standard',
    processingDayOfWeek: body.processingDayOfWeek,
    processingTimeUtc: body.processingTimeUtc,
    claimLimitPerPeriod: body.claimLimitPerPeriod,
    faabBudget: body.faabBudget,
    faabResetDate: body.faabResetDate,
    tiebreakRule: body.tiebreakRule,
    lockType: body.lockType,
    instantFaAfterClear: body.instantFaAfterClear,
  })
  return NextResponse.json(settings)
}

/** Trigger manual waiver run (commissioner only) */
export async function POST(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results = await processWaiverClaimsForLeague(params.leagueId)
  return NextResponse.json({ status: 'ok', processed: results.length, results })
}
