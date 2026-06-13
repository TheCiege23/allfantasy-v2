/**
 * POST /api/leagues/[leagueId]/survivor/idols/play
 * Owner: play owned idol during the valid play window (before vote reveal).
 * playIdol(idolId, playingUserId, councilId, protectedUserId?)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { playIdol } from '@/lib/survivor/idolEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status ?? 403 })

  let body: { idolId?: string; councilId?: string; protectedUserId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { idolId, councilId, protectedUserId } = body
  if (!idolId || !councilId) return NextResponse.json({ error: 'idolId and councilId required' }, { status: 400 })

  try {
    // playIdol(idolId, playingUserId, councilId, protectedUserId?)
    const result = await playIdol(idolId, userId, councilId, protectedUserId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, message: result.message })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
