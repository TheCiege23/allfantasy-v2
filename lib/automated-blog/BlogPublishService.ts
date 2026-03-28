/**
 * BlogPublishService — publish or schedule articles; write BlogPublishLog.
 */

import { prisma } from "@/lib/prisma"

export type PublishAction = "publish" | "schedule" | "unpublish"

export async function publishArticle(articleId: string): Promise<{ ok: boolean; error?: string }> {
  const article = await prisma.blogArticle.findUnique({ where: { articleId } })
  if (!article) return { ok: false, error: "Article not found" }
  if (article.publishStatus === "published") {
    await prisma.blogPublishLog.create({
      data: {
        articleId,
        actionType: "publish",
        status: "already_published",
      },
    })
    return { ok: true }
  }

  await prisma.$transaction([
    prisma.blogArticle.update({
      where: { articleId },
      data: { publishStatus: "published", publishedAt: new Date() },
    }),
    prisma.blogDraft.updateMany({
      where: { articleId },
      data: { draftStatus: "published_snapshot" },
    }),
    prisma.blogPublishLog.create({
      data: {
        articleId,
        actionType: "publish",
        status: "success",
      },
    }),
  ])
  return { ok: true }
}

export async function scheduleArticle(
  articleId: string,
  scheduledAt: Date
): Promise<{ ok: boolean; error?: string }> {
  const article = await prisma.blogArticle.findUnique({ where: { articleId } })
  if (!article) return { ok: false, error: "Article not found" }
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Invalid schedule date" }
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "Schedule date must be in the future" }
  }

  await prisma.$transaction([
    prisma.blogArticle.update({
      where: { articleId },
      data: { publishStatus: "scheduled", publishedAt: scheduledAt },
    }),
    prisma.blogDraft.updateMany({
      where: { articleId },
      data: { draftStatus: "scheduled" },
    }),
    prisma.blogPublishLog.create({
      data: {
        articleId,
        actionType: "schedule",
        status: "scheduled",
      },
    }),
  ])
  return { ok: true }
}

export async function unpublishArticle(articleId: string): Promise<{ ok: boolean; error?: string }> {
  const article = await prisma.blogArticle.findUnique({ where: { articleId } })
  if (!article) return { ok: false, error: "Article not found" }
  if (article.publishStatus === "draft") return { ok: true }

  await prisma.$transaction([
    prisma.blogArticle.update({
      where: { articleId },
      data: { publishStatus: "draft", publishedAt: null },
    }),
    prisma.blogDraft.updateMany({
      where: { articleId },
      data: { draftStatus: "draft" },
    }),
    prisma.blogPublishLog.create({
      data: { articleId, actionType: "unpublish", status: "success" },
    }),
  ])
  return { ok: true }
}

export async function getPublishLog(articleId: string, limit = 10) {
  return prisma.blogPublishLog.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}
