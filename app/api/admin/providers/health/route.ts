/**
 * PROMPT 155 — Admin provider health check route.
 * Returns safe provider health metadata only. No secrets, no stack traces.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runProviderHealthCheck } from '@/lib/ai-orchestration-engine'
import { runClearSportsHealthCheck } from '@/lib/clear-sports/client'
import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'
import { getProviderStatus } from '@/lib/provider-config'

export const dynamic = 'force-dynamic'

type ProviderHealthState = 'configured' | 'available' | 'degraded' | 'unavailable'

interface SafeProviderHealthRow {
  id: 'openai' | 'deepseek' | 'xai' | 'clearsports'
  configured: boolean
  available: boolean
  healthy?: boolean
  state: ProviderHealthState
  latencyMs?: number
  error?: string
}

function resolveState(input: {
  configured: boolean
  probePresent: boolean
  available: boolean
  healthy?: boolean
}): ProviderHealthState {
  const { configured, probePresent, available, healthy } = input
  if (!configured) return 'unavailable'
  if (!probePresent) return 'configured'
  if (!available) return 'unavailable'
  if (healthy === false) return 'degraded'
  return 'available'
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const [healthEntries, clearSportsHealth] = await Promise.all([
      runProviderHealthCheck(),
      runClearSportsHealthCheck(),
    ])
    const status = getProviderStatus()

    const aiProviderDefs: Array<{
      role: 'openai' | 'deepseek' | 'grok'
      id: 'openai' | 'deepseek' | 'xai'
      configured: boolean
    }> = [
      { role: 'openai', id: 'openai', configured: status.openai },
      { role: 'deepseek', id: 'deepseek', configured: status.deepseek },
      { role: 'grok', id: 'xai', configured: status.xai },
    ]

    const aiRows: SafeProviderHealthRow[] = aiProviderDefs.map(({ role, id, configured }) => {
      const health = healthEntries.find((entry) => entry.role === role)
      const probePresent = Boolean(health)
      const healthy = health?.healthy
      const available = configured && (probePresent ? healthy !== false : false)
      return {
        id,
        configured,
        available,
        healthy,
        state: resolveState({ configured, probePresent, available, healthy }),
        error: health?.error ? sanitizeProviderError(health.error) : undefined,
      }
    })

    const clearSportsConfigured = status.clearsports || clearSportsHealth.configured
    const clearSportsProbePresent = true
    const clearSportsAvailable = clearSportsConfigured && clearSportsHealth.available
    const clearSportsRow: SafeProviderHealthRow = {
      id: 'clearsports',
      configured: clearSportsConfigured,
      available: clearSportsAvailable,
      healthy: clearSportsHealth.available,
      state: resolveState({
        configured: clearSportsConfigured,
        probePresent: clearSportsProbePresent,
        available: clearSportsAvailable,
        healthy: clearSportsHealth.available,
      }),
      latencyMs: clearSportsHealth.latencyMs,
      error: clearSportsHealth.error ? sanitizeProviderError(clearSportsHealth.error) : undefined,
    }

    return NextResponse.json({
      providers: [...aiRows, clearSportsRow],
      generatedAt: Date.now(),
    })
  } catch (error) {
    console.warn('[admin/providers/health] failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to run provider health check' },
      { status: 500 },
    )
  }
}
