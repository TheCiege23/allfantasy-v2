import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { finalizeRedraftSeasonChampion } from '@/lib/redraft/playoffEngine'

export const dynamic = 'force-dynamic'

async function canManageLeague(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      userId: true,
      teams: {
        where: { claimedByUserId: userId },
        select: { isCommissioner: true, isCoCommissioner: true },
      },
    },
  })
  if (!league) return false
  if (league.userId === userId) return true
  return (league.teams as { isCommissioner: boolean; isCoCommissioner: boolean }[]).some(
    (t) => t.isCommissioner || t.isCoCommissioner,
  )
}

/**
 * POST /api/redraft/seasons/finalize
 * Body: { seasonId: string }
 *
 * Crowns the champion from the completed final playoff round and marks the
 * season complete. Commissioner-only. Idempotent — safe to call twice.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { seasonId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const seasonId = body.seasonId?.trim()
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 })

  const season = await prisma.redraftSeason.findUnique({
    where: { id: seasonId },
    select: { leagueId: true },
  })
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 })

  const allowed = await canManageLeague(season.leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden — commissioner only' }, { status: 403 })

  const result = await finalizeRedraftSeasonChampion(seasonId, userId)

  if (result.status === 'final_round_incomplete') {
    return NextResponse.json({ error: 'Final playoff round is not yet complete', result }, { status: 422 })
  }
  if (result.status === 'no_winner') {
    return NextResponse.json({ error: 'Final matchup has no winner — run advance first', result }, { status: 422 })
  }
  if (result.status === 'no_bracket') {
    return NextResponse.json({ error: 'No playoff bracket exists for this season', result }, { status: 422 })
  }
  if (result.status === 'no_final_round') {
    return NextResponse.json({ error: 'No playoff rounds found', result }, { status: 422 })
  }

  return NextResponse.json(result)
}
