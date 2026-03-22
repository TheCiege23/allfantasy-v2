import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { runAICommissionerCycle } from '@/lib/ai-commissioner'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    sport: string
    season: number | string
  }>
  const seasonCandidate =
    typeof body?.season === 'number'
      ? body.season
      : typeof body?.season === 'string'
        ? Number.parseInt(body.season, 10)
        : NaN
  const season =
    Number.isFinite(seasonCandidate) && !Number.isNaN(seasonCandidate) ? seasonCandidate : null

  const result = await runAICommissionerCycle({
    leagueId,
    sport: body?.sport ?? null,
    season,
    source: 'commissioner_ui',
  })

  return NextResponse.json(result)
}
