import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { LineupPreferenceEventKind } from '@/lib/lineup-preference-learning/types'
import { buildPublicProfile, computeStatsFromRecentEvents } from '@/lib/lineup-preference-learning/engine'
import { recordUserLineupPreferenceEvent } from '@/lib/lineup-preference-learning/persistence'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KINDS: LineupPreferenceEventKind[] = [
  'ai_lineup_accepted',
  'ai_lineup_rejected',
  'bench_promoted',
  'auto_sub_allowed',
  'auto_sub_denied',
  'injury_contingency_respected',
  'injury_contingency_overridden',
  'lineup_outcome_feedback',
]

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as
    | { user?: { id?: string } }
    | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { kind?: string; payload?: Record<string, unknown> }
  try {
    body = (await req.json()) as { kind?: string; payload?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const kind = body.kind as LineupPreferenceEventKind
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Invalid or missing kind' }, { status: 400 })
  }

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}

  try {
    const { traits } = await recordUserLineupPreferenceEvent(session.user.id, kind, payload)

    const events = await prisma.userLineupPreferenceEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: { kind: true },
    })
    const stats = computeStatsFromRecentEvents(events as { kind: string }[])
    const profile = buildPublicProfile(session.user.id, traits, stats)

    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    console.error('[user/lineup-preferences/event]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record preference event' },
      { status: 500 }
    )
  }
}
