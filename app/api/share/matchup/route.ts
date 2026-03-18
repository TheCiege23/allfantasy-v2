import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { MatchupSharePayload } from '@/lib/matchup-sharing/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const team1Name = String(body.team1Name ?? body.teamAName ?? '').trim()
  const team2Name = String(body.team2Name ?? body.teamBName ?? '').trim()
  const projectedScore1 = Number(body.projectedScore1 ?? body.projectedScoreA ?? 0)
  const projectedScore2 = Number(body.projectedScore2 ?? body.projectedScoreB ?? 0)
  const winProbabilityA = body.winProbabilityA != null ? Number(body.winProbabilityA) : null
  const winProbabilityB = body.winProbabilityB != null ? Number(body.winProbabilityB) : null
  const keyPlayers = Array.isArray(body.keyPlayers) ? body.keyPlayers.map(String) : undefined
  const sport = body.sport != null ? String(body.sport) : undefined
  const weekOrRound = body.weekOrRound != null ? String(body.weekOrRound) : undefined

  if (!team1Name || !team2Name) {
    return NextResponse.json({ error: 'Missing team names' }, { status: 400 })
  }

  const probA = winProbabilityA ?? (winProbabilityB != null ? 100 - winProbabilityB : null)
  const winnerProb = probA != null ? (projectedScore1 >= projectedScore2 ? probA : 100 - probA) : undefined
  const projectedWinner = projectedScore1 >= projectedScore2 ? team1Name : team2Name

  const payload: MatchupSharePayload = {
    team1Name,
    team2Name,
    projectedWinner,
    winProbability: winnerProb,
    projectedScore1,
    projectedScore2,
    keyPlayers,
    sport,
    weekOrRound,
  }

  const title = `${team1Name} vs ${team2Name} — ${projectedWinner} favored`
  const summary = `Projected ${projectedScore1.toFixed(1)} – ${projectedScore2.toFixed(1)}${winnerProb != null ? ` (${Math.round(winnerProb)}% win prob)` : ''}`

  const moment = await prisma.shareableMoment.create({
    data: {
      userId: session.user.id,
      sport: sport ?? 'NFL',
      shareType: 'matchup_share',
      title,
      summary,
      metadata: { payload } as object,
    },
  })

  const base =
    process.env.NEXTAUTH_URL ??
    (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : '')
  const shareUrl = base ? `${base.replace(/\/$/, '')}/share/${moment.id}` : ''

  return NextResponse.json({
    shareId: moment.id,
    shareUrl,
    payload,
    title: moment.title,
    summary: moment.summary,
  })
}
