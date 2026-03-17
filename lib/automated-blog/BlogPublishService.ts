/**
 * BlogPublishService — publish or schedule articles; write BlogPublishLog.
 */

import { prisma } from "@/lib/prisma"

export type PublishAction = "publish" | "schedule" | "unpublish"

export async function publishArticle(articleId: string): Promise<{ ok: boolean; error?: string }> {
  const article = await prisma.blogArticle.findUnique({ where: { articleId } })
  if (!article) return { ok: false, error: "Article not found" }
  if (article.publishStatus === "published") return { ok: true }

  await prisma.$transaction([
    prisma.blogArticle.update({
      where: { articleId },
      data: { publishStatus: "published", publishedAt: new Date() },
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

  await prisma.$transaction([
    prisma.blogArticle.update({
      where: { articleId },
      data: { publishStatus: "scheduled", publishedAt: scheduledAt },
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

  await prisma.blogArticle.update({
    where: { articleId },
    data: { publishStatus: "draft", publishedAt: null },
  })
  await prisma.blogPublishLog.create({
    data: { articleId, actionType: "unpublish", status: "success" },
  })
  return { ok: true }
}

export async function getPublishLog(articleId: string, limit = 10) {
  return prisma.blogPublishLog.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}
