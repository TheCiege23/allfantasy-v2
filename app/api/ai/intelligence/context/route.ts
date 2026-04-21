import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecommendationContext } from '@/lib/ai/memory/aiMemory'

export const dynamic = 'force-dynamic'

/**
 * POST structured intelligence context for clients / Chimmy tooling (no LLM call).
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const sport = String(body.sport ?? 'NFL')
  const season = Math.max(2000, Number(body.season) || new Date().getFullYear())
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const leagueType = typeof body.leagueType === 'string' ? body.leagueType : undefined
  const scoringProfile = typeof body.scoringProfile === 'string' ? body.scoringProfile : undefined
  const playerIds = Array.isArray(body.playerIds) ? body.playerIds.filter((x): x is string => typeof x === 'string') : []

  try {
    const ctx = await getRecommendationContext({
      userId: session.user.id,
      leagueId: leagueId ?? null,
      sport,
      season,
      playerIds,
      leagueType,
      scoringProfile,
    })
    return NextResponse.json({ ok: true, context: ctx })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'context_failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
