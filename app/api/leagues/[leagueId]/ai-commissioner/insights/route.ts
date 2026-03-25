import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { getAICommissionerInsights } from '@/lib/ai-commissioner'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertLeagueMember(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const seasonRaw = url.searchParams.get('season')
  const parsedSeason = Number.parseInt(String(seasonRaw ?? ''), 10)
  const season = Number.isFinite(parsedSeason) ? parsedSeason : null

  const insights = await getAICommissionerInsights({
    leagueId,
    sport: url.searchParams.get('sport'),
    season,
  })
  return NextResponse.json(insights)
}
