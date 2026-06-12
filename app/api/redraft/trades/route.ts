import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

const legacyMeta = {
  legacy: true,
  replacement: {
    listCreate: '/api/redraft/trade-proposals',
    voteResolve: '/api/redraft/trade-votes',
  },
  migrationPhase: 'retired',
}

const GONE_RESPONSE = NextResponse.json(
  {
    error: 'This endpoint is retired. Use /api/redraft/trade-proposals to create trades and /api/redraft/trade-votes to accept, reject, cancel, or vote.',
    replacement: legacyMeta.replacement,
  },
  { status: 410 },
)

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  const status = req.nextUrl.searchParams?.get('status')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const trades = await prisma.redraftLeagueTrade.findMany({
    where: { leagueId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ trades, meta: legacyMeta })
}

// POST is retired — new trades must go through /api/redraft/trade-proposals
export async function POST(_req: NextRequest) {
  return GONE_RESPONSE
}

// PATCH is retired — accept/reject/cancel/vote must go through /api/redraft/trade-votes
export async function PATCH(_req: NextRequest) {
  return GONE_RESPONSE
}

