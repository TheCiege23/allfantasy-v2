/**
 * POST /api/gm-economy/run
 * Body: { managerId?: string }. Runs for the current user's manager only.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runGMEconomyForManager } from '@/lib/gm-economy/GMEconomyEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const managerIdRaw = typeof body.managerId === 'string' ? body.managerId.trim() : ''
    const managerId = managerIdRaw || session.user.id
    if (managerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: can only run GM economy for your own managerId' },
        { status: 403 }
      )
    }

    const result = await runGMEconomyForManager(managerId)
    return NextResponse.json({
      processed: result ? 1 : 0,
      created: result?.created ? 1 : 0,
      updated: result && !result.created ? 1 : 0,
      progressionEventsCreated: result?.progressionEventsCreated ?? 0,
      results: result ? [result] : [],
    })
  } catch (e) {
    console.error('[gm-economy/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Run failed' },
      { status: 500 }
    )
  }
}
