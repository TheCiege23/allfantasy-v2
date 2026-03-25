import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { answerAICommissionerQuestion } from '@/lib/ai-commissioner'

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
    await assertLeagueMember(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    question: string
    sport: string
    season: number | string
  }>
  const question = String(body.question ?? '').trim()
  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const seasonCandidate =
    typeof body.season === 'number'
      ? body.season
      : typeof body.season === 'string'
        ? Number.parseInt(body.season, 10)
        : NaN
  const season = Number.isFinite(seasonCandidate) ? seasonCandidate : null

  const result = await answerAICommissionerQuestion({
    leagueId,
    question,
    sport: body.sport ?? null,
    season,
  })

  return NextResponse.json(result)
}
