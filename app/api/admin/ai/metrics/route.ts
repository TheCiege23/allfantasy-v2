import { NextResponse } from 'next/server'
import {
  getAdminAIMetricsBundle,
  type AIDashboardFilters,
  type AIFeatureCategory,
} from '@/lib/ai/admin/getAIMetrics'
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
  const leagueType = searchParams.get('leagueType') || null
  const feature = (searchParams.get('feature') || 'all') as AIFeatureCategory | 'all'
  const userSegment = (searchParams.get('userSegment') || 'all') as AIDashboardFilters['userSegment']
  const timeRange = (searchParams.get('timeRange') || '30d') as '7d' | '30d' | 'all'

  const filters: AIDashboardFilters = {
    dateFrom,
    dateTo,
    sport: sport === 'all' ? null : sport,
    leagueType: leagueType === 'all' ? null : leagueType,
    feature: feature === 'all' ? 'all' : feature,
    userSegment: userSegment ?? 'all',
  }

  try {
    const data = await getAdminAIMetricsBundle(filters, timeRange)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error('[admin/ai/metrics]', e)
    return NextResponse.json({ ok: false, error: 'Failed to load AI metrics' }, { status: 500 })
  }
}
