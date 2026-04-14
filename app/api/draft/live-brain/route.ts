import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { runLiveDraftBrainDeterministic, type LiveDraftBrainInput } from '@/lib/live-draft-brain'

export const dynamic = 'force-dynamic'

/**
 * POST /api/draft/live-brain
 * Deterministic Live Draft Brain envelope — additive to `/api/draft-ai` and mock-draft routes.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  if (leagueId?.trim()) {
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const payload = body as unknown as LiveDraftBrainInput
    const envelope = runLiveDraftBrainDeterministic(payload)
    return NextResponse.json({ ok: true, envelope })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid payload'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
