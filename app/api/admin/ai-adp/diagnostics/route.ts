/**
 * GET /api/admin/ai-adp/diagnostics — admin-only AI ADP diagnostics.
 * Returns segments (sport, leagueType, formatKey), last computedAt, totalDrafts, totalPicks, entryCount.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const snapshots = await prisma.aiAdpSnapshot.findMany({
      orderBy: [{ sport: 'asc' }, { leagueType: 'asc' }, { formatKey: 'asc' }],
    })
    const segments = snapshots.map((s) => {
      const data = (s.snapshotData as unknown[]) ?? []
      return {
        sport: s.sport,
        leagueType: s.leagueType,
        formatKey: s.formatKey,
        computedAt: s.computedAt?.toISOString() ?? null,
        totalDrafts: s.totalDrafts,
        totalPicks: s.totalPicks,
        entryCount: data.length,
      }
    })
    return NextResponse.json({
      segments,
      summary: {
        totalSegments: segments.length,
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
