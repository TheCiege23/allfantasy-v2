/**
 * GET: Combined draft live sync — authoritative session (when changed) + optional queue + chat.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { runAutomationTicksThrottled } from '@/lib/live-draft-engine/draftAutomationTicks'
import { buildDraftLiveSyncPayload } from '@/lib/draft-room/buildDraftLiveSyncPayload'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await runAutomationTicksThrottled(leagueId)

  const url = req.nextUrl
  const since = url.searchParams.get('since') ?? undefined
  const includeQueue = url.searchParams.get('queue') !== '0'
  const includeChat = url.searchParams.get('chat') !== '0'
  const chatLimit = Math.min(Number(url.searchParams.get('chatLimit') || '80'), 100)

  const payload = await buildDraftLiveSyncPayload(leagueId, userId, {
    since,
    includeQueue,
    includeChat,
    chatLimit,
  })

  return NextResponse.json(payload)
}
