/**
 * POST /api/media/podcast — Fantasy Podcast Generator (HeyGen/audio workflow).
 * Generate → Preview → Approve → Publish. Provider: podcast engine (audio).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateFantasyPodcastScript } from '@/lib/podcast-engine/FantasyPodcastGenerator'
import { synthesizeScriptToAudio } from '@/lib/podcast-engine/VoiceSynthesisService'
import {
  createEpisode,
  getPlaybackUrl,
} from '@/lib/podcast-engine/PodcastDistributionService'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const options = {
    leagueName: body.leagueName,
    sport: body.sport ? normalizeToSupportedSport(body.sport) : undefined,
    weekLabel: body.weekLabel,
  }

  try {
    const { title, script } = generateFantasyPodcastScript(options)
    const synthesis = await synthesizeScriptToAudio(script)

    const episode = await createEpisode({
      userId: session.user.id,
      title,
      script,
      audioUrl: synthesis.audioUrl,
      durationSeconds: synthesis.durationSeconds ?? null,
    })

    if (!episode) {
      return NextResponse.json(
        { id: '', type: 'podcast', status: 'failed', error: 'Failed to create episode' },
        { status: 500 }
      )
    }

    const playbackUrl = getPlaybackUrl(episode)

    const response = {
      id: episode.id,
      type: 'podcast' as const,
      status: 'completed' as const,
      title: episode.title,
      previewUrl: playbackUrl ?? null,
      playbackUrl: playbackUrl ?? null,
      createdAt: episode.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }
    return NextResponse.json(response)
  } catch (e) {
    console.error('[media/podcast]', e)
    return NextResponse.json(
      {
        id: '',
        type: 'podcast',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Podcast generation failed',
      },
      { status: 500 }
    )
  }
}
