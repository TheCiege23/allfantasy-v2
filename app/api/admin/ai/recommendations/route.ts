import { NextResponse } from 'next/server'
import { getRecommendationLogs, type AIDashboardFilters, type AIFeatureCategory } from '@/lib/ai/admin/getAIMetrics'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

function parseDate(s: string | null, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 86400000)

  const dateFrom = parseDate(searchParams.get('dateFrom'), defaultFrom)
  const dateTo = parseDate(searchParams.get('dateTo'), now)
  const sport = searchParams.get('sport') || null
  const feature = (searchParams.get('feature') || 'all') as AIFeatureCategory | 'all'
  const userSegment = (searchParams.get('userSegment') || 'all') as AIDashboardFilters['userSegment']
  const take = Math.min(50, Math.max(5, Number(searchParams.get('take') || 25)))
  const cursor = searchParams.get('cursor') || null
  const search = searchParams.get('search') || null

  const filters: AIDashboardFilters = {
    dateFrom,
    dateTo,
    sport: sport === 'all' ? null : sport,
    leagueType: null,
    feature: feature === 'all' ? 'all' : feature,
    userSegment: userSegment ?? 'all',
  }

  try {
    const result = await getRecommendationLogs(filters, { take, cursor, search })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[admin/ai/recommendations]', e)
    return NextResponse.json({ ok: false, error: 'Failed to load recommendations' }, { status: 500 })
  }
}
