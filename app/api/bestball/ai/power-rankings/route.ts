import { NextRequest, NextResponse } from 'next/server'
import { generateBestBallPowerRankings } from '@/lib/bestball/ai/powerRankings'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { assertLeagueMember } from '@/lib/league/league-access'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate
  const userId = gate

  let body: { leagueId?: string; contestId?: string | null; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  if (body.week == null) return NextResponse.json({ error: 'week required' }, { status: 400 })

  const leagueGate = await assertLeagueMember(leagueId, userId)
  if (!leagueGate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: leagueGate.status })

  const contestId = body.contestId?.trim() || null
  if (contestId) {
    const contestAccess = await prisma.bestBallContest.findFirst({
      where: {
        id: contestId,
        OR: [
          { entries: { some: { userId } } },
          { leagues: { some: { id: leagueId } } },
        ],
      },
      select: { id: true },
    })
    if (!contestAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rankings = await generateBestBallPowerRankings(leagueId, contestId, body.week)
  return NextResponse.json({ rankings })
}
