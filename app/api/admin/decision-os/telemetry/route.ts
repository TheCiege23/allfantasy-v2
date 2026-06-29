import { NextRequest, NextResponse } from 'next/server'
import { isDevAdminUserId } from '@/lib/dev-admin/access'
import { getCurrentUser } from '@/lib/get-current-user'
import {
  isDecisionTelemetryDebugEnabled,
  listDecisionTelemetryDebugEvents,
} from '@/lib/decision-os/core/telemetryDebugStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readParam(request: NextRequest, key: string): string | null {
  const value = request.nextUrl.searchParams.get(key)
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function GET(request: NextRequest) {
  if (!isDecisionTelemetryDebugEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isDevAdminUserId(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const filters = {
    event: readParam(request, 'event'),
    decisionType: readParam(request, 'decisionType'),
    userId: readParam(request, 'userId'),
    leagueId: readParam(request, 'leagueId'),
    decisionId: readParam(request, 'decisionId'),
    limit: Number(request.nextUrl.searchParams.get('limit') ?? NaN),
  }
  const events = listDecisionTelemetryDebugEvents(filters)

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    filters,
    count: events.length,
    events,
  })
}
