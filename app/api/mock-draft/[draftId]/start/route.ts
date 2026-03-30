/**
 * POST: Start mock draft (status -> in_progress). Owner only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startMockDraftRuntime } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

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

  const snapshot = await startMockDraftRuntime(draftId, userId)
  if (!snapshot) return NextResponse.json({ error: 'Draft not found or already started' }, { status: 400 })
  return NextResponse.json({ ok: true, draftId, status: snapshot.status, draft: snapshot })
}
