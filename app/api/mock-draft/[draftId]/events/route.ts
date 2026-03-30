import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMockDraftEvents } from '@/lib/mock-draft-engine/MockDraftRuntimeService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const since = req.nextUrl.searchParams.get('since')
  const events = await getMockDraftEvents(draftId, userId, since)
  if (!events.draft && !events.changed) {
    return NextResponse.json({ changed: false, serverTime: events.serverTime })
  }
  return NextResponse.json(events)
}

