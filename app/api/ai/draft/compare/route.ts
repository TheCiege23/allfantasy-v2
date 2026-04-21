import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runDraftPlayerCompare, type WarRoomPlayer } from '@/lib/ai/aiDraftHelper'
import { assertLeagueAccess } from '@/lib/ai/league-settings-ai/access'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (leagueId) {
    const league = await assertLeagueAccess(leagueId, session.user.id)
    if (!league) {
      return NextResponse.json({ ok: false, error: 'League not found or forbidden' }, { status: 403 })
    }
  }

  const a = body.playerA ?? body.a
  const b = body.playerB ?? body.b
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return NextResponse.json({ ok: false, error: 'playerA and playerB required' }, { status: 400 })
  }

  const playerA = a as WarRoomPlayer
  const playerB = b as WarRoomPlayer
  if (!String(playerA.name ?? '').trim() || !String(playerB.name ?? '').trim()) {
    return NextResponse.json({ ok: false, error: 'Player names required' }, { status: 400 })
  }

  try {
    const result = await runDraftPlayerCompare({
      sport: String(body.sport ?? 'NFL'),
      playerA: {
        name: String(playerA.name),
        position: String(playerA.position ?? ''),
        team: playerA.team ?? null,
        adp: playerA.adp ?? null,
      },
      playerB: {
        name: String(playerB.name),
        position: String(playerB.position ?? ''),
        team: playerB.team ?? null,
        adp: playerB.adp ?? null,
      },
      scoringHint: typeof body.scoringHint === 'string' ? body.scoringHint : undefined,
      rosterContext: typeof body.rosterContext === 'string' ? body.rosterContext : undefined,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Compare failed'
    console.error('[api/ai/draft/compare]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
