/**
 * POST: Commissioner-only. Replace placeholder slotOrder entries with real
 * Roster rows so downstream draft writes can stop assigning picks to fake ids.
 * Idempotent — running twice is a no-op after the first success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'
import { materializeDraftSlots } from '@/lib/league-setup/materializeDraftSlots'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const gate = await assertLeagueActionGate(leagueId, userId, 'draft_commissioner_control')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
  }

  try {
    const result = await materializeDraftSlots(leagueId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
    }
    return NextResponse.json({
      ok: true,
      createdCount: result.createdCount,
      replacedCount: result.replacedCount,
      alreadyMaterializedCount: result.alreadyMaterializedCount,
      slotOrder: result.slotOrder,
    })
  } catch (err) {
    console.error('[setup/materialize-slots POST]', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Server error' },
      { status: 500 },
    )
  }
}
