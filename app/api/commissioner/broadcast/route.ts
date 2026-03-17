/**
 * POST: Commissioner @everyone broadcast to selected league chats.
 * Body: { leagueIds: string[], message: string }. Permission: commissioner of each league.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import { getLeagueChatThreadId } from '@/lib/commissioner-settings/CommissionerAnnouncementService'
import { createSystemMessage } from '@/lib/platform/chat-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const leagueIds = Array.isArray(body.leagueIds) ? body.leagueIds.map((id: unknown) => String(id)).filter(Boolean) : []
  const message = String(body?.message ?? body?.text ?? '').trim()
  if (leagueIds.length === 0) return NextResponse.json({ error: 'leagueIds required' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (message.length > 500) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

  const results: { leagueId: string; sent: boolean; error?: string }[] = []
  const text = `@everyone ${message}`
  for (const leagueId of leagueIds) {
    try {
      await assertCommissioner(leagueId, userId)
    } catch {
      results.push({ leagueId, sent: false, error: 'Forbidden' })
      continue
    }
    const threadId = await getLeagueChatThreadId(leagueId)
    if (threadId && !threadId.startsWith('league:')) {
      const sent = await createSystemMessage(threadId, 'broadcast', text)
      results.push({ leagueId, sent: !!sent })
    } else {
      const created = await createLeagueChatMessage(leagueId, userId, text, { type: 'broadcast' })
      results.push({ leagueId, sent: !!created })
    }
  }
  return NextResponse.json({ ok: true, results })
}
