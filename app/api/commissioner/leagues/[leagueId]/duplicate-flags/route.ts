import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeagueRole } from '@/lib/league/permissions'
import { listDuplicateManagerFlags } from '@/lib/identity/DuplicateManagerFlagService'

type SessionWithUser = { user?: { id?: string } } | null

/** GET: list "possible duplicate manager" flags for this league (commissioner/co-commissioner only). Never returns raw IP/device/fingerprint data — reasons are pre-summarized human-readable strings. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as SessionWithUser
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { leagueId } = await params

  const role = await getLeagueRole(leagueId, userId)
  if (role !== 'commissioner' && role !== 'co_commissioner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const flags = await listDuplicateManagerFlags(leagueId)
  return NextResponse.json({ flags })
}
