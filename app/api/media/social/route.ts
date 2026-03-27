/**
 * POST /api/media/social — Social Clip Generator. Grok (server-side).
 * Generate → Preview → Approve → Publish.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSocialClip } from '@/lib/social-clips-grok'
import { approveForPublish, canPublish, publishAssetToPlatform } from '@/lib/social-clips-grok'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { SOCIAL_ASSET_TYPES, type SocialAssetType } from '@/lib/social-clips-grok/types'
import type { MediaWorkflowAction } from '@/lib/media-generation/types'

export const dynamic = 'force-dynamic'

function getWorkflowAction(raw: unknown): MediaWorkflowAction {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : 'generate'
  if (value === 'preview') return 'preview'
  if (value === 'approve') return 'approve'
  if (value === 'publish') return 'publish'
  return 'generate'
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const action = getWorkflowAction(body.action)

  if (action === 'preview') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Asset id is required' }, { status: 400 })

    const asset = await prisma.socialContentAsset.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>

    return NextResponse.json({
      id: asset.id,
      type: 'social' as const,
      provider: 'grok' as const,
      status: 'draft' as const,
      approved: asset.approvedForPublish,
      title: asset.title,
      previewText:
        typeof metadata.shortCaption === 'string'
          ? metadata.shortCaption
          : asset.contentBody.slice(0, 220),
      shareUrl: `/social-clips/${asset.id}`,
      createdAt: asset.createdAt.toISOString(),
    })
  }

  if (action === 'approve') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Asset id is required' }, { status: 400 })

    const ok = await approveForPublish(id, session.user.id)
    if (!ok) return NextResponse.json({ error: 'Not found or not allowed' }, { status: 404 })

    const asset = await prisma.socialContentAsset.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>

    return NextResponse.json({
      id: asset.id,
      type: 'social' as const,
      provider: 'grok' as const,
      status: 'draft' as const,
      approved: true,
      title: asset.title,
      previewText:
        typeof metadata.shortCaption === 'string'
          ? metadata.shortCaption
          : asset.contentBody.slice(0, 220),
      shareUrl: `/social-clips/${asset.id}`,
      createdAt: asset.createdAt.toISOString(),
    })
  }

  if (action === 'publish') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Asset id is required' }, { status: 400 })

    const platform =
      typeof body.platform === 'string' && body.platform.trim().length > 0
        ? body.platform.trim().toLowerCase()
        : 'x'
    const allowed = await canPublish(id, session.user.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Approve this asset for publish first' }, { status: 400 })
    }

    const publish = await publishAssetToPlatform(id, platform, session.user.id, 'manual')
    const asset = await prisma.socialContentAsset.findFirst({
      where: { id, userId: session.user.id },
    })
    const assetMeta = (asset?.metadata ?? {}) as Record<string, unknown>

    return NextResponse.json(
      {
        id,
        type: 'social' as const,
        provider: 'grok' as const,
        status: 'draft' as const,
        approved: true,
        title: asset?.title,
        previewText: typeof assetMeta.shortCaption === 'string' ? assetMeta.shortCaption : asset?.contentBody?.slice(0, 220) ?? null,
        shareUrl: `/social-clips/${id}`,
        publishStatus: publish.status,
        publishMessage: publish.message ?? null,
      },
      { status: publish.logId ? 200 : 404 }
    )
  }

  const sport = normalizeToSupportedSport(body.sport)
  const assetType = SOCIAL_ASSET_TYPES.includes((body.assetType as SocialAssetType) ?? '')
    ? (body.assetType as SocialAssetType)
    : 'weekly_league_winners'
  const leagueName = typeof body.leagueName === 'string' ? body.leagueName.trim() : undefined
  const week = typeof body.week === 'number' ? body.week : undefined
  const tone = typeof body.tone === 'string' ? body.tone : undefined
  const brandingHint = typeof body.brandingHint === 'string' ? body.brandingHint : undefined

  try {
    const result = await generateSocialClip({
      sport,
      assetType,
      leagueName,
      week,
      tone,
      brandingHint,
    })

    if (!result) {
      return NextResponse.json(
        {
          id: '',
          type: 'social',
          status: 'failed',
          error: 'Grok content generation failed',
        },
        { status: 500 }
      )
    }

    const asset = await prisma.socialContentAsset.create({
      data: {
        userId: session.user.id,
        sport: result.sport,
        assetType: result.assetType,
        title: result.title,
        contentBody: result.contentBody,
        provider: 'grok',
        metadata: {
          shortCaption: result.output.shortCaption,
          shortScriptOverlay: result.output.shortScriptOverlay,
          headline: result.output.headline,
          ctaText: result.output.ctaText,
          hashtags: result.output.hashtags,
          socialCardCopy: result.output.socialCardCopy,
          clipTitle: result.output.clipTitle,
          platformVariants: result.output.platformVariants,
        },
        approvedForPublish: false,
      },
    })

    return NextResponse.json({
      id: asset.id,
      type: 'social' as const,
      provider: 'grok' as const,
      status: 'draft' as const,
      approved: false,
      title: asset.title,
      previewText:
        typeof result.output.shortCaption === 'string' ? result.output.shortCaption : null,
      shareUrl: `/social-clips/${asset.id}`,
      createdAt: asset.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('[media/social]', e)
    return NextResponse.json(
      {
        id: '',
        type: 'social',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Social clip generation failed',
      },
      { status: 500 }
    )
  }
}
