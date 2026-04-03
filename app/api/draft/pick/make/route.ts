import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseSessionKey } from '@/lib/draft/session-key'
import { canAccessLeague } from '@/lib/draft/access'
import { executeDraftPick } from '@/lib/draft/execute-pick'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const playerId = typeof body?.playerId === 'string' ? body.playerId : null
  const playerName = typeof body?.playerName === 'string' ? body.playerName : 'Unknown'
  const position = typeof body?.position === 'string' ? body.position : ''
  const team = typeof body?.team === 'string' ? body.team : null
  const autopicked = body?.autopicked === true

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  let parsed: { mode: 'mock' | 'live'; id: string }
  try {
    parsed = parseSessionKey(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  if (parsed.mode === 'live') {
    const ok = await canAccessLeague(parsed.id, userId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await executeDraftPick({
    sessionId,
    userId,
    playerId,
    playerName,
    position,
    team,
    autopicked,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({ success: true, overallPick: result.overallPick })
}
