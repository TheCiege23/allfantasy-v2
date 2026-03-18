/**
 * POST /api/community/discord/webhook — post content to a Discord webhook (server-side).
 * Webhook URL is sent in request; server performs the POST so the URL is not exposed to client.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { postToDiscordWebhook } from '@/lib/community-integration'
import type { CommunityShareInput } from '@/lib/community-integration/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const webhookUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : ''
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return NextResponse.json(
      { error: 'Valid Discord webhook URL required (https://discord.com/api/webhooks/...)' },
      { status: 400 }
    )
  }

  const input: CommunityShareInput = {
    kind: (body.kind as CommunityShareInput['kind']) ?? 'generic',
    title: String(body.title ?? 'AllFantasy'),
    description: String(body.description ?? ''),
    url: body.url ? String(body.url) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    extraLines: Array.isArray(body.extraLines) ? body.extraLines.map(String) : undefined,
  }

  const result = await postToDiscordWebhook(webhookUrl, input, {
    username: body.username ? String(body.username) : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Webhook post failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
