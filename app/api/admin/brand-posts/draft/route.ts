import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { draftBrandPostWithClaude } from '@/lib/brand-social/draftWithClaude'
import { BRAND_PLATFORMS } from '@/lib/brand-social/types'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_BRIEF_LENGTH = 2000

/**
 * POST /api/admin/brand-posts/draft
 * Body: { platform, brief, tone?, variants?, includeHashtags? }
 * Returns N Claude-drafted variants. Does NOT persist — admin chooses to save/publish/schedule after reviewing.
 */
export const POST = withApiUsage({
  endpoint: '/api/admin/brand-posts/draft',
  tool: 'AdminBrandPostDraft',
})(async (req: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : ''
  const brief = typeof body.brief === 'string' ? body.brief.trim().slice(0, MAX_BRIEF_LENGTH) : ''
  const tone =
    body.tone === 'hype' || body.tone === 'analytical' || body.tone === 'playful' ? body.tone : 'neutral'
  const variants = Number.isFinite(Number(body.variants)) ? Math.floor(Number(body.variants)) : 3
  const includeHashtags = body.includeHashtags !== false

  if (!(BRAND_PLATFORMS as readonly string[]).includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform', allowed: [...BRAND_PLATFORMS] },
      { status: 400 },
    )
  }
  if (!brief || brief.length < 4) {
    return NextResponse.json({ error: 'Brief is required (min 4 characters)' }, { status: 400 })
  }

  try {
    const result = await draftBrandPostWithClaude({
      platform: platform as (typeof BRAND_PLATFORMS)[number],
      brief,
      tone,
      variants,
      includeHashtags,
    })

    prisma.analyticsEvent
      .create({
        data: {
          event: 'tool_use',
          toolKey: 'admin_brand_post_drafted',
          path: '/api/admin/brand-posts/draft',
          userId: gate.user.id,
          meta: {
            adminEmail: gate.user.email,
            platform,
            tone,
            variants: result.variants.length,
            briefPreview: brief.slice(0, 120),
            model: result.model,
          },
        },
      })
      .catch(() => {})

    return NextResponse.json({
      ok: true,
      platform: result.platform,
      model: result.model,
      variants: result.variants,
    })
  } catch (e: any) {
    const msg = e?.message || 'Draft failed'
    if (/ANTHROPIC_API_KEY/i.test(msg)) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured on this server' },
        { status: 503 },
      )
    }
    console.error('[brand-posts/draft]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
