import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireCommissionerRole } from '@/lib/league/permissions'
import { computeReverseMaxPfOrder } from '@/lib/league/maxPF'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }

    await requireCommissionerRole(leagueId, userId)

    const { rows, warning } = await computeReverseMaxPfOrder(leagueId)

    return NextResponse.json({ rows, warning })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[max-pf GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
