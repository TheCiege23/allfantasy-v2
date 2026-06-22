import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import {
  listLeagueTradeBlock,
  upsertTradeBlockItem,
  resolveCallerContext,
  TradeBlockValidationError,
} from '@/lib/trade-block/redraftTradeBlockService'
import { recordRedraftTradeSignalEvent } from '@/lib/trade-market/redraftTradeMarketEvents'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const items = await listLeagueTradeBlock(leagueId)
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    leagueId?: string
    playerId?: string
    playerName?: string
    position?: string | null
    team?: string | null
    askingForPositions?: string[]
    wantsFaab?: boolean
    wantsDraftPicks?: boolean
    packagePreference?: string | null
    note?: string | null
    expiresInDays?: number | null
  }
  const leagueId = body.leagueId?.trim()
  const playerId = body.playerId?.trim()
  if (!leagueId || !playerId || !body.playerName?.trim()) {
    return NextResponse.json({ error: 'leagueId, playerId, playerName required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const ctx = await resolveCallerContext(leagueId, userId)
  if (!ctx.rosterId || !ctx.seasonId) return NextResponse.json({ error: 'You do not have a roster in this league' }, { status: 403 })

  const existed = await prisma.redraftTradeBlockItem.findUnique({
    where: { leagueId_rosterId_playerId: { leagueId, rosterId: ctx.rosterId, playerId } },
    select: { id: true, status: true },
  })

  try {
    const item = await upsertTradeBlockItem({
      leagueId,
      rosterId: ctx.rosterId,
      playerId,
      playerName: body.playerName.trim(),
      position: body.position ?? null,
      team: body.team ?? null,
      askingForPositions: Array.isArray(body.askingForPositions) ? body.askingForPositions : [],
      wantsFaab: body.wantsFaab ?? false,
      wantsDraftPicks: body.wantsDraftPicks ?? false,
      packagePreference: body.packagePreference ?? null,
      note: body.note ?? null,
      expiresAt: body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86400000) : null,
    })

    await recordRedraftTradeSignalEvent({
      leagueId,
      seasonId: ctx.seasonId,
      refId: item.id,
      eventType: existed && existed.status === 'active' ? 'trade_block_updated' : 'trade_block_added',
      actorUserId: userId,
      updatedAtMs: item.updatedAt.getTime(),
      payload: { playerId, position: item.position },
    })

    return NextResponse.json({ item })
  } catch (e) {
    if (e instanceof TradeBlockValidationError) return NextResponse.json({ error: e.message }, { status: 422 })
    return NextResponse.json({ error: 'Failed to update trade block' }, { status: 400 })
  }
}
