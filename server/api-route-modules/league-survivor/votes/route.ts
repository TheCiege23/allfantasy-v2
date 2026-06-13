/**
 * GET /api/leagues/[leagueId]/survivor/votes
 * Returns current council vote state.
 * - Commissioner: sees all votes with voter/target details.
 * - Member: sees only own vote + whether council is open/locked/revealed.
 * Votes are hidden until reveal by default.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status ?? 403 })

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  const isCommissioner = league?.userId === userId

  const council = await prisma.survivorTribalCouncil.findFirst({
    where: { leagueId, status: { in: ['voting_open', 'votes_locked', 'reveal_in_progress', 'complete'] } },
    include: { votes: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!council) return NextResponse.json({ council: null, votes: [] })

  const revealed = council.status === 'complete' || council.status === 'reveal_in_progress'

  if (isCommissioner || revealed) {
    return NextResponse.json({ council: { id: council.id, status: council.status, week: council.week }, votes: council.votes })
  }

  // Non-commissioner pre-reveal: return only own vote + status
  const ownVote = council.votes.find((v: any) => v.voterUserId === userId || v.voterRosterId === userId)
  return NextResponse.json({
    council: { id: council.id, status: council.status, week: council.week },
    votes: ownVote ? [ownVote] : [],
    hiddenUntilReveal: true,
  })
}
