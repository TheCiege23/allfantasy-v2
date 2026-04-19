import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const MAX_REASON_LENGTH = 500

/** POST /api/admin/users/[id]/grants/[grantId]/revoke — body: { reason? } */
export const POST = withApiUsage({
  endpoint: '/api/admin/users/[id]/grants/[grantId]/revoke',
  tool: 'AdminRevokeGrant',
})(async (req: NextRequest, { params }: { params: { id: string; grantId: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const userId = params.id?.trim()
  const grantId = params.grantId?.trim()
  if (!userId || !grantId) {
    return NextResponse.json({ error: 'Missing userId or grantId' }, { status: 400 })
  }

  let body: any = {}
  try {
    body = await req.json().catch(() => ({}))
  } catch {
    /* empty body ok */
  }
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : null

  const existing = await (prisma as any).adminSubscriptionGrant.findUnique({
    where: { id: grantId },
    select: { id: true, userId: true, revokedAt: true, tier: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: 'Grant does not belong to this user' }, { status: 400 })
  }
  if (existing.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true })
  }

  const now = new Date()
  const updated = await (prisma as any).adminSubscriptionGrant.update({
    where: { id: grantId },
    data: {
      revokedAt: now,
      revokedReason: reason,
      revokedByAdminId: gate.user.id,
    },
    select: {
      id: true,
      tier: true,
      revokedAt: true,
      revokedReason: true,
    },
  })

  await prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_revoke_grant',
        path: '/api/admin/users/[id]/grants/[grantId]/revoke',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          targetUserId: userId,
          grantId,
          tier: existing.tier,
          reason,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, grant: updated })
})
