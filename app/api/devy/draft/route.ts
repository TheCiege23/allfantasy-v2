import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { buildAnnualDraftPool } from '@/lib/devy/draftFormatEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const seasonParam = req.nextUrl.searchParams.get('season')
  const draftType = (req.nextUrl.searchParams.get('draftType')?.trim() ?? 'combined') as
    | 'rookie'
    | 'devy'
    | 'combined'

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!cfg) return NextResponse.json({ error: 'Devy league not configured' }, { status: 404 })

  const season = seasonParam ? Number(seasonParam) : cfg.season
  const pool = await buildAnnualDraftPool(leagueId, season, draftType)
  return NextResponse.json({ pool })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { leagueId?: string; season?: number; draftType?: 'rookie' | 'devy' | 'combined' }
  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!cfg) return NextResponse.json({ error: 'Devy league not configured' }, { status: 404 })

  const season = body.season ?? cfg.season
  const draftType = body.draftType ?? 'combined'
  const pool = await buildAnnualDraftPool(leagueId, season, draftType)
  return NextResponse.json({ ok: true, initialized: true, pool })
}
