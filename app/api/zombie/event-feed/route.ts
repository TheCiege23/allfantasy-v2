import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  const typeFilter = searchParams.get('type')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, session.user.id)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const animations = await prisma.zombieEventAnimation.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    select: { id: true },
  })

  let announcements: Array<{
    id: string
    type: string
    title: string
    content: string
    week: number | null
    isPosted: boolean
    createdAt: Date
  }> = []

  if (z) {
    const where: Record<string, unknown> = { zombieLeagueId: z.id }
    if (typeFilter) where.type = typeFilter
    announcements = await prisma.zombieAnnouncement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        week: true,
        isPosted: true,
        createdAt: true,
      },
    })
  }

  return NextResponse.json({ animations, announcements })
}
