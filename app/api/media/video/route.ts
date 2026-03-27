/**
 * POST /api/media/video — Video Generator. HeyGen server-side only (API key never exposed).
 * Generate → Preview → Approve → Publish.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createHeyGenVideo } from '@/lib/fantasy-media/HeyGenVideoService'
import { createEpisode, getEpisode } from '@/lib/fantasy-media/FantasyMediaQueryService'
import { trackVideoJob } from '@/lib/fantasy-media/VideoGenerationJobTracker'
import { refreshVideoJobStatus } from '@/lib/fantasy-media/VideoGenerationJobTracker'
import { resolvePlaybackUrl } from '@/lib/fantasy-media/MediaPlaybackResolver'
import { publishFantasyMediaEpisode } from '@/lib/fantasy-media/FantasyMediaPublishService'
import { MEDIA_TYPES, type MediaType as MediaContentType } from '@/lib/fantasy-media/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import type { MediaWorkflowAction } from '@/lib/media-generation/types'

export const dynamic = 'force-dynamic'

type MediaType = (typeof MEDIA_TYPES)[number]

function getWorkflowAction(raw: unknown): MediaWorkflowAction {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : 'generate'
  if (value === 'preview') return 'preview'
  if (value === 'approve') return 'approve'
  if (value === 'publish') return 'publish'
  return 'generate'
}

function asMetaObject(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {}
  return meta as Record<string, unknown>
}

function isApproved(meta: unknown): boolean {
  const m = asMetaObject(meta)
  const workflow = asMetaObject(m.workflow)
  return typeof workflow.approvedAt === 'string' && workflow.approvedAt.length > 0
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
    if (!id) return NextResponse.json({ error: 'Episode id is required' }, { status: 400 })

    const existing = await getEpisode(id, session.user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.status === 'generating' && existing.providerJobId) {
      await refreshVideoJobStatus(existing.id).catch(() => null)
    }
    const refreshed = (await getEpisode(id, session.user.id)) ?? existing

    return NextResponse.json({
      id: refreshed.id,
      type: 'video' as const,
      provider: 'heygen' as const,
      status: refreshed.status,
      title: refreshed.title,
      playbackUrl: resolvePlaybackUrl(refreshed),
      previewUrl: resolvePlaybackUrl(refreshed),
      shareUrl: `/fantasy-media/${refreshed.id}`,
      providerJobId: refreshed.providerJobId,
      approved: isApproved(refreshed.meta),
      createdAt: refreshed.createdAt?.toISOString?.() ?? new Date().toISOString(),
    })
  }

  if (action === 'approve') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Episode id is required' }, { status: 400 })

    const episode = await getEpisode(id, session.user.id)
    if (!episode) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const currentMeta = asMetaObject(episode.meta)
    const workflowMeta = asMetaObject(currentMeta.workflow)
    const updated = await prisma.fantasyMediaEpisode.update({
      where: { id: episode.id },
      data: {
        meta: {
          ...currentMeta,
          workflow: {
            ...workflowMeta,
            approvedAt: new Date().toISOString(),
            approvedBy: session.user.id,
          },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      type: 'video' as const,
      provider: 'heygen' as const,
      status: updated.status,
      title: updated.title,
      approved: true,
      playbackUrl: resolvePlaybackUrl(updated),
      previewUrl: resolvePlaybackUrl(updated),
      shareUrl: `/fantasy-media/${updated.id}`,
      createdAt: updated.createdAt.toISOString(),
    })
  }

  if (action === 'publish') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Episode id is required' }, { status: 400 })

    const existing = await getEpisode(id, session.user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isApproved(existing.meta)) {
      return NextResponse.json({ error: 'Approve the media before publishing' }, { status: 400 })
    }

    const destinationType =
      typeof body.destinationType === 'string' && body.destinationType.trim().length > 0
        ? body.destinationType.trim().toLowerCase()
        : 'x'
    const publish = await publishFantasyMediaEpisode(id, destinationType, session.user.id)
    const episode = (await getEpisode(id, session.user.id)) ?? existing

    return NextResponse.json(
      {
        id,
        type: 'video' as const,
        provider: 'heygen' as const,
        status: episode?.status ?? 'failed',
        title: episode?.title,
        approved: episode ? isApproved(episode.meta) : false,
        playbackUrl: episode ? resolvePlaybackUrl(episode) : null,
        previewUrl: episode ? resolvePlaybackUrl(episode) : null,
        shareUrl: episode ? `/fantasy-media/${episode.id}` : null,
        publishStatus: publish.status,
        publishMessage: publish.message ?? null,
      },
      { status: publish.publishId ? 200 : 404 }
    )
  }

  const sport = normalizeToSupportedSport(body.sport)
  const contentType = MEDIA_TYPES.includes(body.contentType as MediaType) ? body.contentType : 'weekly_recap'
  const leagueName = body.leagueName ?? 'your league'
  const leagueId = body.leagueId ?? null
  const week = body.week

  try {
    const { buildFantasyVideoScript } = await import('@/lib/fantasy-media/FantasyVideoScriptBuilder')
    const built = buildFantasyVideoScript({
      sport,
      leagueName,
      leagueId,
      week,
      contentType: contentType as MediaContentType,
    })
    const title = body.title ?? built.title
    const script = body.script ?? built.script

    const createResult = await createHeyGenVideo({
      title,
      sport,
      contentType: contentType as MediaContentType,
      script,
      sections: built.sections,
      language: body.language,
      durationTargetSeconds: body.durationTargetSeconds,
      toneStyle: body.toneStyle,
      brandingInstructions: body.brandingInstructions,
      ctaEnding: body.ctaEnding,
    })

    if (!createResult) {
      return NextResponse.json(
        { id: '', type: 'video', status: 'failed', error: 'HeyGen video creation failed' },
        { status: 502 }
      )
    }

    const episode = await createEpisode({
      userId: session.user.id,
      sport,
      leagueId,
      mediaType: contentType,
      title,
      script,
      status: 'generating',
      provider: 'heygen',
      providerJobId: createResult.videoId,
      meta: {
        heygen: createResult.payloadMetadata,
        requested: {
          language: body.language ?? null,
          durationTargetSeconds: body.durationTargetSeconds ?? null,
        },
      },
    })

    void trackVideoJob(episode.id).catch((err) => {
      console.error('[media/video] trackVideoJob failed', episode.id, err)
    })

    return NextResponse.json({
      id: episode.id,
      type: 'video' as const,
      provider: 'heygen' as const,
      status: 'generating' as const,
      approved: false,
      title: episode.title,
      shareUrl: `/fantasy-media/${episode.id}`,
      providerJobId: createResult.videoId,
      createdAt: episode.createdAt?.toISOString?.() ?? new Date().toISOString(),
    })
  } catch (e) {
    console.error('[media/video]', e)
    return NextResponse.json(
      {
        id: '',
        type: 'video',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Video generation failed',
      },
      { status: 500 }
    )
  }
}
