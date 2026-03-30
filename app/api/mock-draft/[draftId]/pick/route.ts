import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitMockDraftPickRuntime } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const playerName = String(body.playerName ?? body.player_name ?? '').trim()
  const position = String(body.position ?? '').trim().toUpperCase()
  if (!playerName || !position) {
    return NextResponse.json({ error: 'playerName and position required' }, { status: 400 })
  }

  const result = await submitMockDraftPickRuntime(draftId, userId, {
    playerName,
    position,
    team: body.team ?? null,
    playerId: body.playerId ?? body.player_id ?? null,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not submit pick' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, draft: result.draft })
}

