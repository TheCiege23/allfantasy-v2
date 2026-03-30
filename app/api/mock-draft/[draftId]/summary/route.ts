import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMockDraftCompletionSummary } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })
  const summary = await getMockDraftCompletionSummary(draftId, userId)
  if (!summary) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  return NextResponse.json({ summary })
}

