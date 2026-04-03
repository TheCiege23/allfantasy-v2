import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { computeReverseMaxPfOrder } from '@/lib/league/maxPF'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 404 ? 'League not found' : 'Forbidden' }, {
      status: gate.status,
    })
  }

  const { rows, warning } = await computeReverseMaxPfOrder(leagueId)

  return NextResponse.json({ rows, warning })
}
