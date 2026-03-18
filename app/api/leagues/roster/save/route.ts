import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleInvalidationTrigger } from '@/lib/trade-engine/caching'
import { isRosterChopped } from '@/lib/guillotine/guillotineGuard'

// Placeholder save endpoint for homepage/app roster auto-save.
// In a future pass this should validate league membership and persist to a real model.
// Guillotine: chopped (eliminated) rosters cannot change lineup/roster.
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { leagueId, rosterId, roster } = body || {}

  if (typeof leagueId === 'string' && leagueId && typeof rosterId === 'string' && rosterId) {
    const chopped = await isRosterChopped(leagueId, rosterId)
    if (chopped) {
      return NextResponse.json(
        { error: 'This team has been eliminated and cannot make roster changes.' },
        { status: 403 }
      )
    }
  }

  if (typeof leagueId === 'string' && leagueId) {
    handleInvalidationTrigger('roster_change', leagueId)
  }

  return NextResponse.json({ ok: true })
}


