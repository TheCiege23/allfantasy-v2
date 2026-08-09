/**
 * GET /api/ai/analytics/rollup
 *
 * Admin-only Chimmy KPI rollup endpoint.
 * Returns aggregate counts and rates — never raw prompt or response text.
 *
 * Query params:
 *   from  YYYY-MM-DD  (required) start date (UTC, inclusive)
 *   to    YYYY-MM-DD  (required) end date (UTC, inclusive)
 *
 * Auth: requireAdmin() — admin session cookie or Bearer/x-admin-secret token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrBearer } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import {
  parseDateRange,
  buildChimmyKPIRollupFromRaw,
  type ChimmyRawEventRow,
} from '@/lib/chimmy-chat/analytics-rollup'

const CHIMMY_TOOL_KEY = 'chimmy_ai_chat'
// Cap rows per request to avoid OOM on large date ranges
const MAX_ROWS = 50_000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminOrBearer(req)
  if (!authResult.ok) {
    return authResult.res
  }

  const { searchParams } = req.nextUrl
  const rawFrom = searchParams.get('from')
  const rawTo = searchParams.get('to')

  const dateRange = parseDateRange(rawFrom, rawTo)
  if (!dateRange.ok) {
    return NextResponse.json({ error: dateRange.error }, { status: 400 })
  }

  const { from, to } = dateRange

  let rows: ChimmyRawEventRow[]
  try {
    rows = await prisma.analyticsEvent.findMany({
      where: {
        toolKey: CHIMMY_TOOL_KEY,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        event: true,
        meta: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_ROWS,
    })
  } catch (err) {
    console.error('[chimmy-rollup] DB query failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const period = {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }

  const rollup = buildChimmyKPIRollupFromRaw(rows, period)

  return NextResponse.json(
    { ok: true, rollup, truncated: rows.length === MAX_ROWS },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
