/**
 * POST /api/media/video — Video Generator. HeyGen server-side only (API key never exposed).
 * Generate → Preview → Approve → Publish.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createHeyGenVideo } from '@/lib/fantasy-media/HeyGenVideoService'
import { createEpisode } from '@/lib/fantasy-media/FantasyMediaQueryService'
import { trackVideoJob } from '@/lib/fantasy-media/VideoGenerationJobTracker'
import { MEDIA_TYPES } from '@/lib/fantasy-media/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

type MediaType = (typeof MEDIA_TYPES)[number]

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sport = normalizeToSupportedSport(body.sport)
  const contentType = MEDIA_TYPES.includes(body.contentType as MediaType) ? body.contentType : 'weekly_recap'
  const leagueName = body.leagueName ?? 'your league'
  const leagueId = body.leagueId ?? null
  const week = body.week

  try {
    const { buildFantasyVideoScript } = await import('@/lib/fantasy-media/FantasyVideoScriptBuilder')
    const built = buildFantasyVideoScript({ sport, leagueName, leagueId, week, contentType: contentType as MediaType })
    const title = body.title ?? built.title
    const script = body.script ?? built.script

    const createResult = await createHeyGenVideo({
      title,
      sport,
      contentType: contentType as MediaType,
      script,
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
    })

    void trackVideoJob(episode.id).catch((err) => {
      console.error('[media/video] trackVideoJob failed', episode.id, err)
    })

    return NextResponse.json({
      id: episode.id,
      type: 'video' as const,
      status: 'generating' as const,
      title: episode.title,
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
