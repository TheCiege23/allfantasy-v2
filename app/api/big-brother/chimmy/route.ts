import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { processBigBrotherLeagueChatInput } from '@/lib/big-brother/chimmyCommandHandler'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/big-brother/chimmy — process @Chimmy commands for Big Brother (private Chimmy tab / tools).
 * League chat uses `/api/league/chat` with the same handler; this endpoint returns structured JSON.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { leagueId?: string; message?: string } | null
  const leagueId = body?.leagueId?.trim()
  const message = body?.message?.trim()
  if (!leagueId || !message) {
    return NextResponse.json({ error: 'leagueId and message required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const result = await processBigBrotherLeagueChatInput(leagueId, userId, message)
  return NextResponse.json({ ok: true, result })
}
