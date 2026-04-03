import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const spRaw = req.nextUrl.searchParams.get('scoringPeriod')
  const status = req.nextUrl.searchParams.get('status')?.trim()

  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 })

  const g = await prisma.guillotineSeason.findFirst({ where: { id: seasonId } })
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(g.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const where: { seasonId: string; scoringPeriod?: number; releaseStatus?: string } = { seasonId }
  const sp = spRaw != null ? Number(spRaw) : NaN
  if (Number.isFinite(sp)) where.scoringPeriod = sp
  if (status) where.releaseStatus = status

  const releases = await prisma.guillotineWaiverRelease.findMany({
    where,
    orderBy: { availableAt: 'asc' },
  })
  return NextResponse.json({ releases })
}
