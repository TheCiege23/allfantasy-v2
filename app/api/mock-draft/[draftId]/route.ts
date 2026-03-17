/**
 * GET: Mock draft session snapshot (for room/reconnect).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMockDraftById } from '@/lib/mock-draft-engine/MockDraftSessionService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const snapshot = await getMockDraftById(draftId, userId ?? undefined)
  if (!snapshot) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  return NextResponse.json({ draft: snapshot })
}
