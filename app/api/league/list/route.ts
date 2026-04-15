import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardLeagueListForUser } from '@/lib/dashboard/get-dashboard-league-list'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getDashboardLeagueListForUser(userId)
    return NextResponse.json(payload)
  } catch (error: unknown) {
    console.error('[League List]', error)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }
}
