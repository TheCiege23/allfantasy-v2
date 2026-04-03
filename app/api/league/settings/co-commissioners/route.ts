import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerOnly } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json()) as {
      leagueId?: string
      memberId?: string
      isCoCommissioner?: boolean
    }

    const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
    const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : ''
    if (!leagueId || !memberId) {
      return NextResponse.json({ error: 'leagueId and memberId required' }, { status: 400 })
    }

    await requireCommissionerOnly(leagueId, session.user.id)

    const team = await prisma.leagueTeam.findFirst({
      where: { id: memberId, leagueId },
    })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    if (team.isCommissioner) {
      return NextResponse.json({ error: 'Cannot change co-commissioner status for the commissioner' }, { status: 400 })
    }

    await prisma.leagueTeam.update({
      where: { id: memberId },
      data: { isCoCommissioner: Boolean(body.isCoCommissioner) },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[co-commissioners PATCH]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
