import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
    const { dispatchPlayerNewsNotifications } = await import('@/lib/notifications/PlayerNewsNotificationService')

    const xResult = await runXNewsIngestion()
    xNewRecords = xResult.newRecords

    // Dispatch notifications for new high/medium impact items
    if (xResult.newRecords > 0) {
      const recentNews = await (await import('@/lib/prisma')).prisma.playerNewsRecord.findMany({
        where: {
          source: 'x_grok_search',
          createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) }, // last 20 min
          impact: { in: ['high', 'medium'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      for (const news of recentNews) {
        const sent = await dispatchPlayerNewsNotifications(
          news.playerName ?? '',
          news.team,
          news.headline,
          (news.impact === 'high' ? 'injury' : 'player_news') as import('@/lib/workers/x-news-ingestion').NewsCategory,
          news.impact as 'high' | 'medium' | 'low',
          news.sport,
        )
        xNotifications += sent
      }
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
    const { dispatchPlayerNewsNotifications } = await import('@/lib/notifications/PlayerNewsNotificationService')

    const newsApiResult = await runNewsAPIIngestion()
    newsApiRecords = newsApiResult.newRecords

    // Dispatch notifications for new high/medium impact NewsAPI items
    if (newsApiResult.newRecords > 0) {
      const recentNewsApi = await (await import('@/lib/prisma')).prisma.playerNewsRecord.findMany({
        where: {
          source: { startsWith: 'newsapi:' },
          createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) },
          impact: { in: ['high', 'medium'] },
          playerName: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      for (const news of recentNewsApi) {
        if (!news.playerName) continue
        const sent = await dispatchPlayerNewsNotifications(
          news.playerName,
          news.team,
          news.headline,
          (news.impact === 'high' ? 'injury' : 'player_news') as import('@/lib/workers/x-news-ingestion').NewsCategory,
          news.impact as 'high' | 'medium' | 'low',
          news.sport,
        )
        newsApiNotifications += sent
      }
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
