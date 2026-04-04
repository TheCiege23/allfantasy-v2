import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner } from '@/lib/league/league-access'
import { executeMerge } from '@/lib/devy/mergeExecutionEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { sessionId?: string }
  const sessionId = body.sessionId?.trim()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const gate = await assertLeagueCommissioner(row.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  await prisma.devyImportSession.update({
    where: { id: sessionId },
    data: { approvedAt: new Date(), status: 'approved' },
  })

  const result = await executeMerge(sessionId, userId)
  return NextResponse.json({ result })
}
