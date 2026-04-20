import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { BRAND_POST_STATUSES, PLATFORM_CHAR_LIMITS, type BrandPlatform } from '@/lib/brand-social/types'
import { publishBrandPostById } from '@/lib/brand-social/publishBrandPost'

export const dynamic = 'force-dynamic'

const MAX_BODY_LENGTH = 5000
const MAX_REASON_LENGTH = 500

type CreateIntent = 'save_draft' | 'schedule' | 'publish_now'

function isIntent(v: unknown): v is CreateIntent {
  return v === 'save_draft' || v === 'schedule' || v === 'publish_now'
}

/**
 * GET /api/admin/brand-posts
 * Query: ?status=draft|scheduled|sent|failed|cancelled (optional, defaults to all)
 *        ?accountId=... (optional)
 *        ?limit=50 (default 100, max 500)
 */
export const GET = withApiUsage({
  endpoint: '/api/admin/brand-posts',
  tool: 'AdminBrandPostsList',
})(async (request: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')?.trim().toLowerCase() ?? null
  const accountId = url.searchParams.get('accountId')?.trim() || null
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '100')))

  const where: any = {}
  if (statusParam && (BRAND_POST_STATUSES as readonly string[]).includes(statusParam)) {
    where.status = statusParam
  }
  if (accountId) where.accountId = accountId

  const posts = await (prisma as any).brandSocialPost.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      accountId: true,
      status: true,
      body: true,
      mediaUrl: true,
      scheduledFor: true,
      publishedAt: true,
      providerPostId: true,
      failureMessage: true,
      aiModel: true,
      createdByEmail: true,
      createdAt: true,
      updatedAt: true,
      account: {
        select: {
          platform: true,
          handle: true,
          displayName: true,
        },
      },
    },
  }).catch((err: any) => {
    console.error('[admin/brand-posts] findMany failed', err)
    return [] as any[]
  })

  return NextResponse.json({
    ok: true,
    count: posts.length,
    posts,
  })
})

/**
 * POST /api/admin/brand-posts
 * Body: { accountId, body, mediaUrl?, aiPrompt?, aiModel?, intent, scheduledFor? }
 *
 * - intent='save_draft'  → stores status='draft'
 * - intent='schedule'    → stores status='scheduled' (requires scheduledFor in the future)
 * - intent='publish_now' → stores status='draft' then attempts publish inline; final status reflects result
 */
export const POST = withApiUsage({
  endpoint: '/api/admin/brand-posts',
  tool: 'AdminBrandPostCreate',
})(async (request: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  const mediaUrl = typeof body.mediaUrl === 'string' && body.mediaUrl.trim() ? body.mediaUrl.trim() : null
  const aiPrompt =
    typeof body.aiPrompt === 'string' ? body.aiPrompt.trim().slice(0, MAX_REASON_LENGTH) : null
  const aiModel = typeof body.aiModel === 'string' ? body.aiModel.trim().slice(0, 64) : null
  const intent = isIntent(body.intent) ? body.intent : null
  const scheduledForRaw = typeof body.scheduledFor === 'string' ? body.scheduledFor : null

  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `body exceeds ${MAX_BODY_LENGTH} chars` }, { status: 400 })
  }
  if (!intent) return NextResponse.json({ error: 'intent must be save_draft | schedule | publish_now' }, { status: 400 })

  const account = await (prisma as any).brandSocialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, platform: true, handle: true, isActive: true },
  })
  if (!account) return NextResponse.json({ error: 'Brand account not found' }, { status: 404 })
  if (!account.isActive) return NextResponse.json({ error: 'Account is inactive' }, { status: 400 })

  const platformLimit = PLATFORM_CHAR_LIMITS[account.platform as BrandPlatform]
  if (platformLimit && text.length > platformLimit) {
    return NextResponse.json(
      { error: `Body exceeds ${account.platform} limit (${text.length}/${platformLimit})` },
      { status: 400 },
    )
  }

  let scheduledFor: Date | null = null
  if (intent === 'schedule') {
    if (!scheduledForRaw) return NextResponse.json({ error: 'scheduledFor required for schedule' }, { status: 400 })
    const d = new Date(scheduledForRaw)
    if (!Number.isFinite(d.getTime())) return NextResponse.json({ error: 'Invalid scheduledFor' }, { status: 400 })
    if (d.getTime() < Date.now() + 30_000) {
      return NextResponse.json({ error: 'scheduledFor must be at least 30 seconds in the future' }, { status: 400 })
    }
    scheduledFor = d
  }

  const initialStatus = intent === 'schedule' ? 'scheduled' : 'draft'

  const created = await (prisma as any).brandSocialPost.create({
    data: {
      accountId,
      status: initialStatus,
      body: text,
      mediaUrl,
      scheduledFor,
      aiPrompt,
      aiModel,
      createdByAdminId: gate.user.id,
      createdByEmail: gate.user.email ?? 'unknown',
    },
    select: {
      id: true,
      status: true,
      scheduledFor: true,
      createdAt: true,
    },
  })

  await prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_post_created',
        path: '/api/admin/brand-posts',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          postId: created.id,
          intent,
          platform: account.platform,
          handle: account.handle,
          scheduledFor: created.scheduledFor?.toISOString() ?? null,
          bodyLength: text.length,
        },
      },
    })
    .catch(() => {})

  if (intent === 'publish_now') {
    const pub = await publishBrandPostById(created.id)
    return NextResponse.json({
      ok: true,
      id: created.id,
      intent,
      // If publishBrandPostById failed at state-machine level, surface the reason.
      publish: pub.ok ? { ok: true, result: pub.result } : { ok: false, error: pub.error, code: pub.code },
    })
  }

  return NextResponse.json({ ok: true, id: created.id, intent, status: created.status })
})
