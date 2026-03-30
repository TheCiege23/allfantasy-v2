/**
 * GET: Join mock by token (query ?token=). Returns draft snapshot.
 * POST: Join mock by token in body (optional displayName). Claims first empty human slot.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMockDraftByInviteToken, joinMockDraftByToken } from '@/lib/mock-draft-engine/MockDraftSessionService'
import { getMockDraftRuntimeSnapshot } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const snapshot = await getMockDraftByInviteToken(token)
  if (!snapshot) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  return NextResponse.json({ draft: snapshot })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const token = body.token ?? body.inviteToken
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const result = await joinMockDraftByToken(token, userId, body.displayName ?? (session?.user as any)?.name)
  if (!result) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  const snapshot = await getMockDraftRuntimeSnapshot(result.draftId, userId)
  return NextResponse.json({
    ok: true,
    draftId: result.draftId,
    joined: result.joined,
    draft: snapshot,
  })
}
