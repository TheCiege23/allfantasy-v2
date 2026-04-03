import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    leagueId?: string
    bbWaiversEnabled?: boolean
    bbTradesEnabled?: boolean
    bbFaEnabled?: boolean
    bbIrEnabled?: boolean
    bbTaxiEnabled?: boolean
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  try {
    await requireCommissionerRole(leagueId, userId)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const league = await prisma.league.update({
    where: { id: leagueId },
    data: {
      ...(typeof body.bbWaiversEnabled === 'boolean' ? { bbWaiversEnabled: body.bbWaiversEnabled } : {}),
      ...(typeof body.bbTradesEnabled === 'boolean' ? { bbTradesEnabled: body.bbTradesEnabled } : {}),
      ...(typeof body.bbFaEnabled === 'boolean' ? { bbFaEnabled: body.bbFaEnabled } : {}),
      ...(typeof body.bbIrEnabled === 'boolean' ? { bbIrEnabled: body.bbIrEnabled } : {}),
      ...(typeof body.bbTaxiEnabled === 'boolean' ? { bbTaxiEnabled: body.bbTaxiEnabled } : {}),
    },
  })

  return NextResponse.json({ league })
}
