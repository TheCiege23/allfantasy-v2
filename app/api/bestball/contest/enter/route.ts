import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { contestId?: string; entryName?: string | null }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const contestId = body.contestId?.trim()
  if (!contestId) return NextResponse.json({ error: 'contestId required' }, { status: 400 })

  const contest = await prisma.bestBallContest.findFirst({ where: { id: contestId } })
  if (!contest || contest.status !== 'open') {
    return NextResponse.json({ error: 'Contest not open' }, { status: 400 })
  }

  if (contest.maxEntriesPerUser != null) {
    const n = await prisma.bestBallEntry.count({ where: { contestId, userId } })
    if (n >= contest.maxEntriesPerUser) {
      return NextResponse.json({ error: 'Max entries reached' }, { status: 400 })
    }
  }

  const entry = await prisma.bestBallEntry.create({
    data: {
      contestId,
      userId,
      entryName: body.entryName ?? null,
      entryNumber: (await prisma.bestBallEntry.count({ where: { contestId, userId } })) + 1,
    },
  })

  return NextResponse.json({ entry })
}
