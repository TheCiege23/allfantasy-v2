/**
 * GET /api/ai/providers/health — active provider health checks (no secrets).
 * Uses provider registry checks with timeout and returns safe status for admin diagnostics.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProviderHealth } from '@/lib/ai-orchestration'
import { getProviderStatus } from '@/lib/provider-config'
import { runClearSportsHealthCheck } from '@/lib/clear-sports/client'
import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [providers, clearSportsHealth] = await Promise.all([
    checkProviderHealth(),
    runClearSportsHealthCheck(),
  ])
  const status = getProviderStatus()
  const clearSportsConfigured = status.clearsports || clearSportsHealth.configured
  const clearSports = {
    provider: 'clearsports',
    configured: clearSportsConfigured,
    healthy: clearSportsConfigured ? clearSportsHealth.available : false,
    checkedAt: clearSportsHealth.checkedAt,
    latencyMs: clearSportsHealth.latencyMs,
    error: clearSportsHealth.error ? sanitizeProviderError(clearSportsHealth.error) : undefined,
  }
  const anyHealthy =
    Object.values(providers).some((provider) => provider.healthy) ||
    Boolean(clearSports.healthy)
  return NextResponse.json({
    ok: anyHealthy,
    providers,
    clearSports,
    checkedAt: new Date().toISOString(),
  })
}
