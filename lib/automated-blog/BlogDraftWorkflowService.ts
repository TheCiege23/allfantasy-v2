/**
 * BlogDraftWorkflowService — create and update draft articles; no publish.
 */

import { prisma } from "@/lib/prisma"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { GeneratedDraft } from "./types"

export interface CreateDraftInput {
  sport: string
  category: string
  draft: GeneratedDraft
}

export async function createDraft(input: CreateDraftInput): Promise<{ articleId: string; slug: string } | null> {
  const sport = normalizeToSupportedSport(input.sport)
  let slug = input.draft.slug
  const existing = await prisma.blogArticle.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const article = await prisma.blogArticle.create({
    data: {
      title: input.draft.title,
      slug,
      sport,
      category: input.category,
      excerpt: input.draft.excerpt || null,
      body: input.draft.body,
      seoTitle: input.draft.seoTitle || null,
      seoDescription: input.draft.seoDescription || null,
      tags: input.draft.tags as any,
      publishStatus: "draft",
    },
  })
  return { articleId: article.articleId, slug: article.slug }
}

export async function updateDraft(
  articleId: string,
  updates: Partial<{
    title: string
    slug: string
    excerpt: string
    body: string
    seoTitle: string
    seoDescription: string
    tags: string[]
  }>
): Promise<boolean> {
  const existing = await prisma.blogArticle.findUnique({ where: { articleId } })
  if (!existing || existing.publishStatus !== "draft") return false

  const data: Record<string, unknown> = {}
  if (updates.title != null) data.title = updates.title.slice(0, 512)
  if (updates.slug != null) data.slug = updates.slug
  if (updates.excerpt != null) data.excerpt = updates.excerpt.slice(0, 1024)
  if (updates.body != null) data.body = updates.body
  if (updates.seoTitle != null) data.seoTitle = updates.seoTitle.slice(0, 512)
  if (updates.seoDescription != null) data.seoDescription = updates.seoDescription.slice(0, 512)
  if (updates.tags != null) data.tags = updates.tags

  await prisma.blogArticle.update({
    where: { articleId },
    data: data as any,
  })
  return true
}
