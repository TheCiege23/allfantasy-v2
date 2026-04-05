import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { applyRedraftTradeCapTransfers, validateRedraftTradeCap } from '@/lib/idp/capEngine'
import { enqueueCollusionScan } from '@/lib/integrity/enqueueCollusionScan'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const status = req.nextUrl.searchParams.get('status')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const trades = await prisma.redraftLeagueTrade.findMany({
    where: { leagueId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ trades })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    leagueId?: string
    seasonId?: string
    proposerRosterId?: string
    receiverRosterId?: string
    proposerOffers?: unknown
    receiverOffers?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  const seasonId = body.seasonId?.trim()
  const proposerRosterId = body.proposerRosterId?.trim()
  const receiverRosterId = body.receiverRosterId?.trim()
  if (!leagueId || !seasonId || !proposerRosterId || !receiverRosterId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const proposer = await prisma.redraftRoster.findFirst({ where: { id: proposerRosterId } })
  const receiver = await prisma.redraftRoster.findFirst({ where: { id: receiverRosterId } })
  if (!proposer || !receiver) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
  if (proposer.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000)

  const trade = await prisma.redraftLeagueTrade.create({
    data: {
      leagueId,
      seasonId,
      proposerId: userId,
      proposerRosterId,
      receiverId: receiver.ownerId,
      receiverRosterId,
      proposerOffers: body.proposerOffers ?? [],
      receiverOffers: body.receiverOffers ?? [],
      expiresAt,
    },
  })

  return NextResponse.json({ trade })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tradeId?: string; action?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tradeId = body.tradeId?.trim()
  if (!tradeId || !body.action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const t = await prisma.redraftLeagueTrade.findFirst({ where: { id: tradeId } })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(t.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const next =
    body.action === 'accept'
      ? 'accepted'
      : body.action === 'reject'
        ? 'rejected'
        : body.action === 'veto'
          ? 'vetoed'
          : t.status

  if (body.action === 'accept') {
    const cap = await validateRedraftTradeCap(
      t.leagueId,
      t.proposerRosterId,
      t.receiverRosterId,
      t.proposerOffers,
      t.receiverOffers,
    )
    if (!cap.ok) {
      return NextResponse.json({ error: cap.message }, { status: 409 })
    }
    try {
      await applyRedraftTradeCapTransfers(
        t.leagueId,
        t.proposerRosterId,
        t.receiverRosterId,
        t.proposerOffers,
        t.receiverOffers,
      )
    } catch (e) {
      console.error('[redraft/trades] IDP cap transfer failed', e)
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Cap transfer failed' },
        { status: 409 },
      )
    }
  }

  const updated = await prisma.redraftLeagueTrade.update({
    where: { id: tradeId },
    data: { status: next },
  })

  if (body.action === 'accept' && updated.status === 'accepted') {
    void enqueueCollusionScan(updated.leagueId, updated.id, [
      updated.proposerRosterId,
      updated.receiverRosterId,
    ]).catch((e) => console.error('[redraft/trades] enqueueCollusionScan failed', e))
  }

  return NextResponse.json({ trade: updated })
}
