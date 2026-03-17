/**
 * POST /api/media/blog — Blog Generator. OpenAI for content (server-side).
 * Generate → Preview → Approve → Publish.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAndSaveDraft } from '@/lib/automated-blog'
import { BLOG_CATEGORIES } from '@/lib/automated-blog/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { BlogCategory } from '@/lib/automated-blog/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sport = normalizeToSupportedSport(body.sport)
  const category = BLOG_CATEGORIES.includes((body.category as BlogCategory) ?? '') ? (body.category as BlogCategory) : 'weekly_strategy'
  const topicHint = typeof body.topicHint === 'string' ? body.topicHint.trim() : undefined

  try {
    const result = await generateAndSaveDraft({
      sport,
      category,
      topicHint,
      contentType: category,
    })

    if (!result.ok) {
      return NextResponse.json(
        { id: '', type: 'blog', status: 'failed', error: result.error ?? 'Generation failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      id: result.articleId!,
      type: 'blog' as const,
      status: 'draft' as const,
      articleSlug: result.slug ?? null,
      createdAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[media/blog]', e)
    return NextResponse.json(
      {
        id: '',
        type: 'blog',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Blog generation failed',
      },
      { status: 500 }
    )
  }
}
