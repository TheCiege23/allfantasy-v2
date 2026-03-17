import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createInviteLink } from '@/lib/invite-engine'
import type { InviteType } from '@/lib/invite-engine/types'

export const dynamic = 'force-dynamic'

function getBaseUrl(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
    : process.env.NEXTAUTH_URL ?? 'https://allfantasy.ai'
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const type = (body.type as InviteType) ?? 'referral'
  const targetId = body.targetId ?? null
  const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : null
  const maxUses = typeof body.maxUses === 'number' ? body.maxUses : 0

  const validTypes = ['league', 'bracket', 'creator_league', 'referral', 'reactivation', 'waitlist']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid invite type' }, { status: 400 })
  }

  let expiresAt: Date | null = null
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  const result = await createInviteLink(userId, type, {
    targetId,
    expiresAt,
    maxUses: maxUses || 0,
    metadata: body.metadata ?? undefined,
    baseUrl: getBaseUrl(req),
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, inviteLink: result.inviteLink })
}
