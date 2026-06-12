/**
 * POST /api/leagues/[leagueId]/survivor/vote
 * Cast or update the requesting user's vote before council lock.
 * Requires voterRosterId + targetRosterId in addition to userId/targetUserId.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { submitVote } from '@/lib/survivor/votingEngine'

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

  let body: {
    councilId?: string
    targetUserId?: string
    voterRosterId?: string
    targetRosterId?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { councilId, targetUserId, voterRosterId, targetRosterId } = body
  if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  if (!voterRosterId || !targetRosterId) {
    return NextResponse.json({ error: 'voterRosterId and targetRosterId required' }, { status: 400 })
  }

  try {
    await submitVote(councilId, userId, targetUserId, { voterRosterId, targetRosterId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const status = msg.startsWith('409') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
