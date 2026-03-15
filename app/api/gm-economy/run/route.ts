/**
 * POST /api/gm-economy/run
 * Body: { managerId?: string }. If managerId: run for one manager; else run for all (limit 500).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runGMEconomyForManager, runGMEconomyForAll } from '@/lib/gm-economy/GMEconomyEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId as string | undefined

    if (managerId) {
      const result = await runGMEconomyForManager(managerId)
      return NextResponse.json({
        processed: result ? 1 : 0,
        created: result?.created ? 1 : 0,
        updated: result && !result.created ? 1 : 0,
        results: result ? [result] : [],
      })
    }

    const result = await runGMEconomyForAll({ limit: 500 })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[gm-economy/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Run failed' },
      { status: 500 }
    )
  }
}
