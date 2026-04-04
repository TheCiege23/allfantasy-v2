import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner } from '@/lib/league/league-access'
import { connectSource } from '@/lib/devy/importEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    sessionId?: string
    sourceType?: string
    platform?: string
    classification?: string
    data?: Record<string, unknown>
  }
  const sessionId = body.sessionId?.trim()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const gate = await assertLeagueCommissioner(row.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const src = await connectSource(
    sessionId,
    body.sourceType ?? 'manual',
    body.platform ?? 'custom',
    body.classification ?? 'nfl_roster',
    (body.data ?? {}) as Record<string, unknown>,
  )
  return NextResponse.json({ source: src })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { sessionId?: string; sourceId?: string; classification?: string }
  const sessionId = body.sessionId?.trim()
  const sourceId = body.sourceId?.trim()
  if (!sessionId || !sourceId || !body.classification) {
    return NextResponse.json({ error: 'sessionId, sourceId, classification required' }, { status: 400 })
  }

  const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const gate = await assertLeagueCommissioner(row.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  await prisma.devyImportSource.updateMany({
    where: { id: sourceId, sessionId },
    data: { classification: body.classification },
  })
  await prisma.devyImportSession.update({
    where: { id: sessionId },
    data: { status: 'classified' },
  })
  const updated = await prisma.devyImportSource.findFirst({ where: { id: sourceId } })
  return NextResponse.json({ ok: true, source: updated })
}
