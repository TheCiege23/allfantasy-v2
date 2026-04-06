import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findLandingHomeInviteLinkByToken } from '@/lib/dashboard/LandingInviteLinkService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const COOKIE = 'af_landing_invite'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Records a landing page view for a home invite token and sets a cookie for signup attribution.
 */
export async function POST(req: Request) {
  let token = ''
  try {
    const body = (await req.json()) as { token?: string }
    token = typeof body.token === 'string' ? body.token.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  const link = await findLandingHomeInviteLinkByToken(token)
  if (!link) {
    return NextResponse.json({ ok: false, valid: false })
  }

  await prisma.inviteLinkEvent
    .create({
      data: {
        inviteLinkId: link.id,
        eventType: 'viewed',
        metadata: { source: 'landing_home' } as object,
      },
    })
    .catch(() => {})

  const cookieStore = await cookies()
  cookieStore.set(COOKIE, link.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  })

  return NextResponse.json({ ok: true, valid: true })
}
