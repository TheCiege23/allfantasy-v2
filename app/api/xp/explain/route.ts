/**
 * POST /api/xp/explain
 * Body: { managerId }. Returns narrative for "How did I earn this XP?" / AI explain.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { explainXPForManager } from '@/lib/xp-progression/XPExplainService'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }
    if (managerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await explainXPForManager(managerId)
    return NextResponse.json({
      managerId,
      narrative: result.narrative,
      totalXP: result.totalXP,
      currentTier: result.currentTier,
      eventSummary: result.eventSummary,
      source: 'xp_progression',
    })
  } catch (e) {
    console.error('[xp/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain XP' },
      { status: 500 }
    )
  }
}
