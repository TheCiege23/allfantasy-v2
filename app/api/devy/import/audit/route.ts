import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { generateImportAudit } from '@/lib/devy/mergeExecutionEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get('sessionId')?.trim()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(row.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const audit = await generateImportAudit(sessionId)
  return NextResponse.json({ audit, session: { id: row.id, status: row.status, mergedAt: row.mergedAt, summary: row.summary } })
}
