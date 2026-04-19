import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/** Tier slugs valid for admin grants (must be in SubscriptionPlanId). */
const ALLOWED_TIERS = new Set(['pro', 'supreme', 'commissioner', 'war_room'])
/** Preset durations (in days). */
const ALLOWED_DURATION_DAYS = new Set([5, 10, 14, 30, 365])
const MAX_REASON_LENGTH = 500

/** POST /api/admin/users/[id]/grant-subscription — body: { tier, durationDays, reason? } */
export const POST = withApiUsage({
  endpoint: '/api/admin/users/[id]/grant-subscription',
  tool: 'AdminGrantSubscription',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const userId = params.id?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tier = typeof body.tier === 'string' ? body.tier.trim().toLowerCase() : ''
  const durationDays = Number(body.durationDays)
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : null

  if (!ALLOWED_TIERS.has(tier)) {
    return NextResponse.json(
      { error: 'Invalid tier', allowed: [...ALLOWED_TIERS] },
      { status: 400 },
    )
  }
  if (!Number.isFinite(durationDays) || !ALLOWED_DURATION_DAYS.has(durationDays)) {
    return NextResponse.json(
      { error: 'Invalid durationDays', allowed: [...ALLOWED_DURATION_DAYS] },
      { status: 400 },
    )
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const grant = await (prisma as any).adminSubscriptionGrant.create({
    data: {
      userId,
      tier,
      startsAt: now,
      expiresAt,
      grantedByAdminId: gate.user.id,
      grantedByEmail: gate.user.email ?? 'unknown',
      reason,
    },
    select: {
      id: true,
      tier: true,
      startsAt: true,
      expiresAt: true,
      grantedByEmail: true,
      reason: true,
    },
  })

  await prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_grant_subscription',
        path: '/api/admin/users/[id]/grant-subscription',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          targetUserId: user.id,
          targetEmail: user.email,
          tier,
          durationDays,
          expiresAt: expiresAt.toISOString(),
          grantId: grant.id,
          reason,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, grant })
})

/** GET /api/admin/users/[id]/grant-subscription — list grants (active + historical) for a user. */
export const GET = withApiUsage({
  endpoint: '/api/admin/users/[id]/grant-subscription',
  tool: 'AdminListGrants',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const userId = params.id?.trim()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const now = new Date()
  const grants = await (prisma as any).adminSubscriptionGrant.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      tier: true,
      startsAt: true,
      expiresAt: true,
      grantedByEmail: true,
      reason: true,
      revokedAt: true,
      revokedReason: true,
      createdAt: true,
    },
  })

  const active = grants.filter(
    (g: any) => !g.revokedAt && new Date(g.expiresAt) > now,
  )

  return NextResponse.json({ ok: true, grants, activeCount: active.length, now: now.toISOString() })
})
