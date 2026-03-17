import { NextRequest, NextResponse } from 'next/server'
import { getInvitePreview, recordInviteEvent } from '@/lib/invite-engine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/invite/preview?code=XXX
 * Public: returns invite preview (no PII). Optionally records "viewed" for analytics.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? undefined
  const userId = req.nextUrl.searchParams.get('userId') ?? undefined
  const recordView = req.nextUrl.searchParams.get('recordView') !== 'false'

  const preview = await getInvitePreview(code, { userId: userId || null })

  if (recordView && preview.token && preview.status !== 'invalid') {
    const link = await prisma.inviteLink.findUnique({
      where: { token: preview.token },
      select: { id: true },
    })
    if (link) {
      await recordInviteEvent(link.id, 'viewed').catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, preview })
}
