/**
 * POST /api/referral/share — log referral share event (channel) for growth analytics.
 * Body: { channel: string } (e.g. copy_link | sms | email | twitter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recordShare } from '@/lib/referral'

export const dynamic = 'force-dynamic'

const ALLOWED_CHANNELS = ['copy_link', 'sms', 'email', 'twitter', 'x', 'discord', 'reddit', 'whatsapp']

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const channel = typeof body.channel === 'string' ? body.channel.trim().toLowerCase() : null
  if (!channel || !ALLOWED_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'Invalid or missing channel' }, { status: 400 })
  }

  await recordShare(userId, channel)
  return NextResponse.json({ ok: true })
}
