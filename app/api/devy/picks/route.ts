import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { generatePickInventory, processPickTrade } from '@/lib/devy/pickInventoryEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  const type = req.nextUrl.searchParams.get('type')?.trim()
  const seasonParam = req.nextUrl.searchParams.get('season')

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!cfg) return NextResponse.json({ error: 'Devy league not configured' }, { status: 404 })

  const season = seasonParam ? Number(seasonParam) : cfg.season

  if (type === 'all') {
    const picks = await prisma.devyDraftPick.findMany({
      where: { leagueId },
      orderBy: [{ season: 'asc' }, { round: 'asc' }],
    })
    return NextResponse.json({ picks })
  }

  if (!rosterId) {
    return NextResponse.json({ error: 'rosterId required unless type=all' }, { status: 400 })
  }

  const inventory = await generatePickInventory(leagueId, season, 3)
  const filtered = inventory.years.map(y => ({
    ...y,
    rookiePicks: y.rookiePicks.filter(p => p.currentOwnerId === rosterId || p.originalOwnerId === rosterId),
    devyPicks: y.devyPicks.filter(p => p.currentOwnerId === rosterId || p.originalOwnerId === rosterId),
  }))
  return NextResponse.json({ inventory: { ...inventory, years: filtered } })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    leagueId?: string
    pickId?: string
    action?: string
    toRosterId?: string
    fromRosterId?: string
  }
  const leagueId = body.leagueId?.trim()
  const pickId = body.pickId?.trim()
  const action = body.action?.trim()
  if (!leagueId || !pickId || action !== 'trade') {
    return NextResponse.json({ error: 'leagueId, pickId, action=trade required' }, { status: 400 })
  }
  const fromRosterId = body.fromRosterId?.trim()
  const toRosterId = body.toRosterId?.trim()
  if (!fromRosterId || !toRosterId) {
    return NextResponse.json({ error: 'fromRosterId and toRosterId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  try {
    const pick = await processPickTrade(leagueId, fromRosterId, toRosterId, pickId)
    return NextResponse.json({ ok: true, pick })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Trade failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
