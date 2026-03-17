/**
 * PROMPT 155 — Admin-only provider diagnostics. Safe metadata only (no secrets, no stack traces).
 * GET /api/admin/providers/diagnostics — requires admin session.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runProviderHealthCheck } from '@/lib/ai-orchestration-engine'
import { getProviderStatus } from '@/lib/provider-config'
import { getProviderDiagnostics } from '@/lib/admin/provider-status-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const healthEntries = await runProviderHealthCheck()
    const status = getProviderStatus()
    const payload = getProviderDiagnostics(
      healthEntries,
      status.clearsports,
      status.clearsports,
    )
    return NextResponse.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Diagnostics failed'
    console.warn('[admin/providers/diagnostics]', message)
    return NextResponse.json(
      { error: 'Failed to load provider diagnostics', details: message },
      { status: 500 },
    )
  }
}
