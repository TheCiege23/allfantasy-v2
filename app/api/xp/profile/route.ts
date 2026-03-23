/**
 * GET /api/xp/profile?managerId=
 * Returns ManagerXPProfileView or a default view if no profile exists.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateProfileView } from '@/lib/xp-progression/ManagerXPQueryService'

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
