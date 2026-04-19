/**
 * GET /api/intelligence/snapshot?leagueId=optional
 * Unified time context (UTC + user TZ), platform health, and optional validated league intelligence context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildIntelligenceSnapshot } from '@/lib/intelligence/buildIntelligenceSnapshot'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim() || null

  try {
    const snapshot = await buildIntelligenceSnapshot({ userId, leagueId })
    return NextResponse.json(snapshot)
  } catch (e) {
    console.error('[intelligence/snapshot]', e)
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
