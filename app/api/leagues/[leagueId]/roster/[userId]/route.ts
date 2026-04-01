import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeagueRosterView } from '@/lib/data/league-home'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; userId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId, userId } = await ctx.params
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const requestedUserId = userId === 'me' ? sessionUserId : userId
  if (requestedUserId !== sessionUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await getLeagueRosterView(leagueId, requestedUserId)
  if (!data) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
