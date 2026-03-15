/**
 * POST /api/xp/run
 * Body: { managerId?: string, sport?: string }. If managerId: run for one manager; else run for all.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runForManager, runForAllManagers } from '@/lib/xp-progression/XPProgressionEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId as string | undefined
    const sport = (body.sport as string) ?? undefined

    if (managerId) {
      const result = await runForManager(managerId, { sport })
      return NextResponse.json({
        processed: 1,
        results: [result],
      })
    }

    const results = await runForAllManagers({ sport })
    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (e) {
    console.error('[xp/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Run failed' },
      { status: 500 }
    )
  }
}
