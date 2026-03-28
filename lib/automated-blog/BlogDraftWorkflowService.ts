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

const SLUG_MAX = 120

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX)
}

async function resolveUniqueSlug(seed: string, articleId?: string): Promise<string> {
  const base = toSlug(seed) || "article"
  let candidate = base
  let suffix = 1
  while (true) {
    const existing = await prisma.blogArticle.findFirst({
      where: {
        slug: candidate,
        ...(articleId ? { articleId: { not: articleId } } : {}),
      },
      select: { articleId: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function createDraft(input: CreateDraftInput): Promise<{ articleId: string; slug: string } | null> {
  const sport = normalizeToSupportedSport(input.sport)
  const slug = await resolveUniqueSlug(input.draft.slug || input.draft.title || "article")

  const article = await prisma.$transaction(async (tx) => {
    const created = await tx.blogArticle.create({
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
    await tx.blogDraft.create({
      data: {
        articleId: created.articleId,
        title: input.draft.title,
        slug,
        sport,
        category: input.category,
        excerpt: input.draft.excerpt || null,
        body: input.draft.body,
        seoTitle: input.draft.seoTitle || null,
        seoDescription: input.draft.seoDescription || null,
        tags: input.draft.tags as any,
        draftStatus: "draft",
      },
    })
    await tx.blogPublishLog.create({
      data: {
        articleId: created.articleId,
        actionType: "save_draft",
        status: "success",
      },
    })
    return created
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
  const existing = await prisma.blogArticle.findUnique({
    where: { articleId },
    include: { draft: true },
  })
  if (!existing || existing.publishStatus !== "draft") return false

  const data: Record<string, unknown> = {}
  if (updates.title != null) data.title = updates.title.slice(0, 512)
  const resolvedSlug = updates.slug != null ? await resolveUniqueSlug(updates.slug, articleId) : undefined
  if (resolvedSlug != null) data.slug = resolvedSlug
  if (updates.excerpt != null) data.excerpt = updates.excerpt.slice(0, 1024)
  if (updates.body != null) data.body = updates.body
  if (updates.seoTitle != null) data.seoTitle = updates.seoTitle.slice(0, 512)
  if (updates.seoDescription != null) data.seoDescription = updates.seoDescription.slice(0, 512)
  if (updates.tags != null) data.tags = updates.tags

  await prisma.$transaction(async (tx) => {
    await tx.blogArticle.update({
      where: { articleId },
      data: data as any,
    })
    await tx.blogDraft.upsert({
      where: { articleId },
      create: {
        articleId,
        title: (updates.title ?? existing.title).slice(0, 512),
        slug: resolvedSlug ?? existing.slug,
        sport: existing.sport,
        category: existing.category,
        excerpt:
          updates.excerpt != null
            ? updates.excerpt.slice(0, 1024)
            : existing.excerpt,
        body: updates.body ?? existing.body,
        seoTitle:
          updates.seoTitle != null
            ? updates.seoTitle.slice(0, 512)
            : existing.seoTitle,
        seoDescription:
          updates.seoDescription != null
            ? updates.seoDescription.slice(0, 512)
            : existing.seoDescription,
        tags: (updates.tags ?? (Array.isArray(existing.tags) ? existing.tags : [])) as any,
        draftStatus: "draft",
      },
      update: {
        title: updates.title != null ? updates.title.slice(0, 512) : undefined,
        slug: resolvedSlug,
        excerpt: updates.excerpt != null ? updates.excerpt.slice(0, 1024) : undefined,
        body: updates.body ?? undefined,
        seoTitle: updates.seoTitle != null ? updates.seoTitle.slice(0, 512) : undefined,
        seoDescription:
          updates.seoDescription != null ? updates.seoDescription.slice(0, 512) : undefined,
        tags: updates.tags ?? undefined,
        draftStatus: "draft",
      },
    })
    await tx.blogPublishLog.create({
      data: {
        articleId,
        actionType: "save_draft",
        status: "success",
      },
    })
  })
  return true
}

export async function getDraftPublishLogs(articleId: string, limit = 20) {
  return prisma.blogPublishLog.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}
