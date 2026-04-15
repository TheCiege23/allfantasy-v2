import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const NEWS_LOOKBACK_MS = 20 * 60 * 1000
const NEWS_DISPATCH_LIMIT = 20

type DispatchCategory =
  | 'injury'
  | 'suspension'
  | 'trade'
  | 'signing'
  | 'release'
  | 'roster_move'
  | 'team_news'
  | 'player_news'
  | 'game_update'
  | 'coaching'

/**
 * Classify a news row into a notification category by scanning the
 * headline + body for category keywords. Falls back to `player_news`
 * for anything that doesn't match. This mirrors the classifier used
 * during ingestion but runs at dispatch time so historical rows get
 * correct categorization too.
 */
function classifyNewsCategory(headline: string, body: string | null): DispatchCategory {
  const haystack = `${headline} ${body ?? ''}`.toLowerCase()
  const matchers: Array<{ category: DispatchCategory; keywords: string[] }> = [
    { category: 'injury', keywords: ['injury', 'injured', 'ruled out', 'questionable', 'doubtful', 'concussion', 'day-to-day', 'hamstring', 'knee', 'ankle', 'shoulder', 'acl', 'torn', 'fracture', 'surgery'] },
    { category: 'suspension', keywords: ['suspended', 'suspension', 'banned', 'ped', 'conduct'] },
    { category: 'trade', keywords: ['traded', 'trade', 'acquired', 'blockbuster', 'swap'] },
    { category: 'signing', keywords: ['signs', 'signed', 'contract', 'extension', 'agrees'] },
    { category: 'release', keywords: ['released', 'waived', 'cut', 'dfa', 'designated for assignment'] },
    { category: 'roster_move', keywords: ['placed on ir', 'injured reserve', 'activated', 'recalled', 'promoted', 'demoted', 'roster move'] },
    { category: 'coaching', keywords: ['head coach', 'coaching change', 'coordinator', 'fired', 'hired'] },
    { category: 'team_news', keywords: ['front office', 'ownership', 'relocat'] },
    { category: 'game_update', keywords: ['postponed', 'cancelled', 'delayed', 'weather'] },
  ]
  for (const { category, keywords } of matchers) {
    if (keywords.some((k) => haystack.includes(k))) return category
  }
  return 'player_news'
}

/**
 * Shared dispatch helper for both the X Grok and NewsAPI ingestion
 * branches. Queries recent, undispatched PlayerNewsRecord rows matching
 * the given source filter, fires push notifications, and stamps
 * notificationDispatchedAt so subsequent cron runs skip them.
 */
async function dispatchRecentPlayerNews(
  // Always a Prisma.StringFilter object so callers are consistent —
  // pass { equals: 'x_grok_search' } or { startsWith: 'newsapi:' } etc.
  sourceFilter: Prisma.StringFilter,
): Promise<number> {
  const { prisma } = await import('@/lib/prisma')
  const { dispatchPlayerNewsNotifications } = await import(
    '@/lib/notifications/PlayerNewsNotificationService'
  )

  const records = await prisma.playerNewsRecord.findMany({
    where: {
      source: sourceFilter,
      createdAt: { gte: new Date(Date.now() - NEWS_LOOKBACK_MS) },
      impact: { in: ['high', 'medium'] },
      // PlayerNewsRecord.playerName is a non-nullable String column in the
      // Prisma schema, so a { not: null } filter is both redundant and a
      // type error. Rows with an empty-string playerName are skipped by
      // the trim guard below.
      notificationDispatchedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: NEWS_DISPATCH_LIMIT,
  })

  let notifications = 0
  for (const news of records) {
    if (!news.playerName || news.playerName.trim().length === 0) continue
    const category = classifyNewsCategory(news.headline, news.body)
    const sent = await dispatchPlayerNewsNotifications(
      news.playerName,
      news.team,
      news.headline,
      category as import('@/lib/workers/x-news-ingestion').NewsCategory,
      news.impact as 'high' | 'medium' | 'low',
      news.sport,
    )
    notifications += sent
    await prisma.playerNewsRecord
      .update({ where: { id: news.id }, data: { notificationDispatchedAt: new Date() } })
      .catch(() => null)
  }
  return notifications
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let saved = 0
  let errors = 0
  let attempts = 0

  for (const sport of SUPPORTED_SPORTS) {
    attempts++
    try {
      const result = await fetchWithChain({
        sport,
        dataType: 'news',
        forceRefresh: true,
      })
      if (Array.isArray(result.data)) saved += result.data.length
    } catch (e: unknown) {
      console.error(`[import-news] ${sport}:`, e instanceof Error ? e.message : e)
      errors++
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  // Also run X API news ingestion for real-time updates
  let xNewRecords = 0
  let xNotifications = 0
  try {
    const { runXNewsIngestion } = await import('@/lib/workers/x-news-ingestion')

    const xResult = await runXNewsIngestion()
    xNewRecords = xResult.newRecords

    if (xResult.newRecords > 0) {
      xNotifications = await dispatchRecentPlayerNews({ equals: 'x_grok_search' })
    }

    if (xResult.errors.length > 0) {
      console.warn('[import-news] X ingestion errors:', xResult.errors)
    }
  } catch (e) {
    console.warn('[import-news] X ingestion non-fatal:', e instanceof Error ? e.message : e)
  }

  // Also run NewsAPI ingestion
  let newsApiRecords = 0
  let newsApiNotifications = 0
  try {
    const { runNewsAPIIngestion } = await import('@/lib/workers/newsapi-ingestion')

    const newsApiResult = await runNewsAPIIngestion()
    newsApiRecords = newsApiResult.newRecords

    if (newsApiResult.newRecords > 0) {
      newsApiNotifications = await dispatchRecentPlayerNews({ startsWith: 'newsapi:' })
    }

    if (newsApiResult.errors.length > 0) {
      console.warn('[import-news] NewsAPI errors:', newsApiResult.errors)
    }
  } catch (e) {
    console.warn('[import-news] NewsAPI ingestion non-fatal:', e instanceof Error ? e.message : e)
  }

  console.log(`[import-news] saved=${saved} errors=${errors} xNew=${xNewRecords} xNotifs=${xNotifications} newsApi=${newsApiRecords} newsApiNotifs=${newsApiNotifications}`)
  const status = attempts > 0 && errors === attempts ? 500 : 200
  return NextResponse.json({ saved, errors, xNewRecords, xNotifications, newsApiRecords, newsApiNotifications }, { status })
}
