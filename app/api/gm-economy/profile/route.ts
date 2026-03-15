/**
 * GET /api/gm-economy/profile?managerId=
 * Returns franchise profile for a manager (cross-league career).
 */

import { NextResponse } from 'next/server'
import { getFranchiseProfileByManager } from '@/lib/gm-economy/GMProfileQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }

    const profile = await getFranchiseProfileByManager(managerId)
    return NextResponse.json({ managerId, profile: profile ?? null })
  } catch (e) {
    console.error('[gm-economy/profile GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load profile' },
      { status: 500 }
    )
  }
}
