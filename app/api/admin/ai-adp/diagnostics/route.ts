/**
 * GET /api/admin/ai-adp/diagnostics — admin-only AI ADP diagnostics.
 * Returns segments (sport, leagueType, formatKey), last computedAt, totalDrafts, totalPicks, entryCount.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getRecentAiAdpHistory } from '@/lib/ai-adp-engine'

export const dynamic = 'force-dynamic'

const STALE_AFTER_HOURS = 36

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const [snapshots, history] = await Promise.all([
      prisma.aiAdpSnapshot.findMany({
        orderBy: [{ sport: 'asc' }, { leagueType: 'asc' }, { formatKey: 'asc' }],
      }),
      getRecentAiAdpHistory(40),
    ])
    const segments = snapshots.map((s) => {
      const data = (s.snapshotData as unknown[]) ?? []
      const ageHours = (Date.now() - s.computedAt.getTime()) / (60 * 60 * 1000)
      return {
        sport: s.sport,
        leagueType: s.leagueType,
        formatKey: s.formatKey,
        computedAt: s.computedAt?.toISOString() ?? null,
        ageHours: Math.round(ageHours * 10) / 10,
        stale: ageHours >= STALE_AFTER_HOURS,
        totalDrafts: s.totalDrafts,
        totalPicks: s.totalPicks,
        entryCount: data.length,
      }
    })
    const staleSegments = segments.filter((x) => x.stale).length
    return NextResponse.json({
      segments,
      recentHistory: history,
      summary: {
        totalSegments: segments.length,
        staleSegments,
        sports: [...new Set(segments.map((x) => x.sport))].sort(),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Diagnostics failed'
    console.warn('[admin/ai-adp/diagnostics]', message)
    return NextResponse.json(
      { error: 'Failed to load AI ADP diagnostics', details: message },
      { status: 500 },
    )
  }
}
