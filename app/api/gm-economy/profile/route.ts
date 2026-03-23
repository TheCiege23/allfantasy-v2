/**
 * GET /api/gm-economy/profile?managerId=
 * Returns franchise profile for a manager (cross-league career).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFranchiseProfileByManager } from '@/lib/gm-economy/GMProfileQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }
    if (managerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
