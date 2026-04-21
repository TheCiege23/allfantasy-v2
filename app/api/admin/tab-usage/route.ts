import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/** Valid tab identifiers — mirrors the AdminTab union in app/admin/page.tsx. */
const KNOWN_TABS = new Set([
  'overview',
  'signups',
  'questionnaire',
  'ideas',
  'feedback',
  'email',
  'blog',
  'tools',
  'analytics',
  'ai_issues',
  'share_rewards',
  'calibration',
  'model_drift',
  'users',
  'leagues',
  'operations',
  'moderation',
  'audit',
  'features',
  'system',
  'providers',
  'content',
])

/** Parse a stored `page_view` path like `/admin?tab=users&q=x` into its `tab` value. */
function parseTabFromPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/admin')) return null

  const queryIdx = raw.indexOf('?')
  if (queryIdx === -1) {
    // Bare `/admin` or `/admin/<sub>` (e.g. /admin/system-health). We only classify
    // `/admin` (no sub-route, no tab param) as 'overview'; sub-routes are bucketed
    // as 'other' so streamlining decisions don't get polluted.
    if (raw === '/admin' || raw === '/admin/') return 'overview'
    return 'other'
  }

  const query = raw.slice(queryIdx + 1)
  const params = new URLSearchParams(query)
  const tab = params.get('tab')?.trim().toLowerCase() ?? null
  if (!tab) return 'overview' // `/admin?other=…` with no tab = overview default
  return KNOWN_TABS.has(tab) ? tab : 'other'
}

/**
 * GET /api/admin/tab-usage?days=30
 *
 * Aggregates admin-tab `page_view` events by tab over the last N days (max 365).
 * Returns count + distinct session/user counts per tab.
 */
export const GET = withApiUsage({
  endpoint: '/api/admin/tab-usage',
  tool: 'AdminTabUsage',
})(async (request: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '30')))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Pull the raw page_view rows — then bucket by tab in JS so we don't need dialect-
  // specific SQL. Admin traffic is low enough that this stays cheap.
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      event: 'page_view',
      path: { startsWith: '/admin' },
      createdAt: { gte: since },
    },
    select: { path: true, sessionId: true, userId: true, createdAt: true },
    take: 50000,
  })

  const buckets = new Map<
    string,
    { count: number; sessions: Set<string>; users: Set<string>; lastSeen: Date }
  >()

  for (const r of rows) {
    const tab = parseTabFromPath(r.path)
    if (!tab) continue
    const b =
      buckets.get(tab) ??
      { count: 0, sessions: new Set<string>(), users: new Set<string>(), lastSeen: new Date(0) }
    b.count += 1
    if (r.sessionId) b.sessions.add(r.sessionId)
    if (r.userId) b.users.add(r.userId)
    if (r.createdAt > b.lastSeen) b.lastSeen = r.createdAt
    buckets.set(tab, b)
  }

  // Make sure every known tab is present, even with zero views — that's the point
  // of the report.
  for (const tab of KNOWN_TABS) {
    if (!buckets.has(tab)) {
      buckets.set(tab, { count: 0, sessions: new Set(), users: new Set(), lastSeen: new Date(0) })
    }
  }

  const tabs = Array.from(buckets.entries())
    .map(([tab, b]) => ({
      tab,
      views: b.count,
      uniqueSessions: b.sessions.size,
      uniqueUsers: b.users.size,
      lastSeen: b.lastSeen.getTime() === 0 ? null : b.lastSeen.toISOString(),
    }))
    .sort((a, b) => b.views - a.views)

  const totalViews = tabs.reduce((s, t) => s + t.views, 0)
  const zeroViewTabs = tabs.filter((t) => t.views === 0 && t.tab !== 'other').map((t) => t.tab)

  return NextResponse.json({
    ok: true,
    days,
    since: since.toISOString(),
    totalViews,
    rowsScanned: rows.length,
    truncated: rows.length === 50000,
    tabs,
    zeroViewTabs,
  })
})
