/**
 * POST /api/xp/run
 * Body: { managerId?: string, sport?: string }. Runs XP for the current user's manager.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runForManager } from '@/lib/xp-progression/XPProgressionEngine'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

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
    const rawSport = body.sport as string | undefined
    const sport =
      rawSport && isSupportedSport(rawSport)
        ? normalizeToSupportedSport(rawSport)
        : undefined

    if (managerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: can only run XP for your own managerId' },
        { status: 403 }
      )
    }

    const result = await runForManager(managerId, { sport })
    return NextResponse.json({
      processed: 1,
      results: [result],
    })
  } catch (e) {
    console.error('[xp/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Run failed' },
      { status: 500 }
    )
  }
}
