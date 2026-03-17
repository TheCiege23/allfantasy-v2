import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeInviteLink } from '@/lib/invite-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const inviteLinkId = body.inviteLinkId ?? body.id
  if (!inviteLinkId) return NextResponse.json({ error: 'Missing inviteLinkId' }, { status: 400 })

  const ok = await revokeInviteLink(inviteLinkId, userId)
  if (!ok) return NextResponse.json({ error: 'Invite not found or access denied' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
