/**
 * POST /api/media/blog — Blog Generator. OpenAI for content (server-side).
 * Generate → Preview → Approve → Publish.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAndSaveDraft } from '@/lib/automated-blog'
import { publishArticle } from '@/lib/automated-blog'
import { BLOG_CATEGORIES } from '@/lib/automated-blog/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { BlogCategory } from '@/lib/automated-blog/types'
import { prisma } from '@/lib/prisma'
import type { MediaWorkflowAction } from '@/lib/media-generation/types'

export const dynamic = 'force-dynamic'

function getWorkflowAction(raw: unknown): MediaWorkflowAction {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : 'generate'
  if (value === 'preview') return 'preview'
  if (value === 'approve') return 'approve'
  if (value === 'publish') return 'publish'
  return 'generate'
}

function statusFromPublishStatus(publishStatus: string): 'draft' | 'completed' {
  return publishStatus === 'published' ? 'completed' : 'draft'
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
    if (!id) return NextResponse.json({ error: 'Article id is required' }, { status: 400 })

    const article = await prisma.blogArticle.findUnique({ where: { articleId: id } })
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      id: article.articleId,
      type: 'blog' as const,
      provider: 'openai' as const,
      status: statusFromPublishStatus(article.publishStatus),
      approved: article.publishStatus !== 'draft',
      title: article.title,
      previewText: article.excerpt ?? article.body.slice(0, 220),
      articleSlug: article.slug,
      shareUrl: `/blog/${article.slug}`,
      createdAt: article.createdAt.toISOString(),
    })
  }

  if (action === 'approve') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Article id is required' }, { status: 400 })

    const article = await prisma.blogArticle.findUnique({ where: { articleId: id } })
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.blogPublishLog.create({
      data: {
        articleId: article.articleId,
        actionType: 'approve',
        status: 'success',
      },
    })

    return NextResponse.json({
      id: article.articleId,
      type: 'blog' as const,
      provider: 'openai' as const,
      status: statusFromPublishStatus(article.publishStatus),
      approved: true,
      title: article.title,
      previewText: article.excerpt ?? article.body.slice(0, 220),
      articleSlug: article.slug,
      shareUrl: `/blog/${article.slug}`,
      createdAt: article.createdAt.toISOString(),
    })
  }

  if (action === 'publish') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Article id is required' }, { status: 400 })

    const published = await publishArticle(id)
    if (!published.ok) {
      return NextResponse.json({ error: published.error ?? 'Publish failed' }, { status: 400 })
    }

    const article = await prisma.blogArticle.findUnique({ where: { articleId: id } })
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      id: article.articleId,
      type: 'blog' as const,
      provider: 'openai' as const,
      status: statusFromPublishStatus(article.publishStatus),
      approved: true,
      title: article.title,
      previewText: article.excerpt ?? article.body.slice(0, 220),
      articleSlug: article.slug,
      shareUrl: `/blog/${article.slug}`,
      publishStatus: 'success' as const,
      publishMessage: 'Published.',
      createdAt: article.createdAt.toISOString(),
    })
  }

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

    const article = await prisma.blogArticle.findUnique({
      where: { articleId: result.articleId! },
      select: {
        articleId: true,
        title: true,
        excerpt: true,
        body: true,
        slug: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      id: result.articleId!,
      type: 'blog' as const,
      provider: 'openai' as const,
      status: 'draft' as const,
      approved: false,
      title: article?.title ?? 'Blog draft',
      previewText: article?.excerpt ?? article?.body?.slice(0, 220) ?? null,
      articleSlug: result.slug ?? null,
      shareUrl: result.slug ? `/blog/${result.slug}` : null,
      createdAt: article?.createdAt?.toISOString?.() ?? new Date().toISOString(),
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
