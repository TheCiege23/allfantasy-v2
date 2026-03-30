import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resetMockDraft } from '@/lib/mock-draft-engine/MockDraftSessionService'
import { getMockDraftRuntimeSnapshot } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const ok = await resetMockDraft(draftId, userId)
  if (!ok) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  const draft = await getMockDraftRuntimeSnapshot(draftId, userId)
  return NextResponse.json({ ok: true, draft })
}

