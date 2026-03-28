/**
 * PROMPT 155 — Admin-only provider diagnostics. Safe metadata only (no secrets, no stack traces).
 * GET /api/admin/providers/diagnostics — requires admin session.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runProviderHealthCheck } from '@/lib/ai-orchestration-engine'
import { runClearSportsHealthCheck } from '@/lib/clear-sports/client'
import { getProviderDiagnostics } from '@/lib/admin/provider-status-service'
import { getProviderStatus } from '@/lib/provider-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const healthEntries = await runProviderHealthCheck()
    const clearsportsHealth = await runClearSportsHealthCheck()
    const providerStatus = getProviderStatus()
    const payload = getProviderDiagnostics({
      healthEntries,
      providerStatus,
      clearSportsHealth: clearsportsHealth,
    })
    return NextResponse.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Diagnostics failed'
    console.warn('[admin/providers/diagnostics]', message)
    return NextResponse.json(
      { error: 'Failed to load provider diagnostics' },
      { status: 500 },
    )
  }
}
