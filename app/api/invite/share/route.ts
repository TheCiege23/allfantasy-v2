import { NextRequest, NextResponse } from 'next/server'
import { recordInviteEvent } from '@/lib/invite-engine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/invite/share — log share event (channel: copy_link | sms | email | twitter | discord | reddit | whatsapp).
 * Body: { inviteLinkId?: string, token?: string, channel: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const inviteLinkId = body.inviteLinkId ?? null
  const token = (body.token ?? '').trim().toUpperCase()
  const channel = (body.channel ?? 'copy_link') as string

  let linkId = inviteLinkId
  if (!linkId && token) {
    const link = await prisma.inviteLink.findUnique({
      where: { token },
      select: { id: true },
    })
    linkId = link?.id ?? null
  }
  if (!linkId) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  const validChannels = ['copy_link', 'sms', 'email', 'twitter', 'x', 'discord', 'reddit', 'whatsapp']
  const eventChannel = validChannels.includes(channel) ? channel : 'copy_link'
  await recordInviteEvent(linkId, 'shared', eventChannel)
  return NextResponse.json({ ok: true })
}
