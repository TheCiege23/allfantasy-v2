/**
 * GET /api/xp/profile?managerId=
 * Returns ManagerXPProfileView or a default view if no profile exists.
 */

import { NextResponse } from 'next/server'
import { getOrCreateProfileView } from '@/lib/xp-progression/ManagerXPQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }

    const profile = await getOrCreateProfileView(managerId)
    return NextResponse.json(profile)
  } catch (e) {
    console.error('[xp/profile GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load XP profile' },
      { status: 500 }
    )
  }
}
