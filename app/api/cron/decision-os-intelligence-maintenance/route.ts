import { NextResponse } from 'next/server'

import { createManagedIntelligenceDeps } from '@/lib/decision-os/three-brain/phase2/realAdapters'
import { runIntelligenceMaintenance } from '@/lib/decision-os/three-brain/phase2/maintenanceRunner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/decision-os-intelligence-maintenance
 *
 * The scheduled trigger for the Decision OS Phase 2 durable maintenance runner: it drains pending
 * intelligence-refresh jobs and reconciles expired/abandoned token reservations. This is a BACKGROUND cron —
 * NOT one of the four live Decision OS user routes and NOT wired to Chimmy. Reconciliation runs here with no
 * user request; refresh execution is inert until a live evidence rehydrator is injected (Phase 3), by design.
 */
function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (bearer && bearer === secret) return true
  if (process.env.NODE_ENV !== 'production') {
    const q = new URL(request.url).searchParams.get('secret')
    if (q && q === secret) return true
  }
  return false
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    // Minute-bucket tick id. Overlap is prevented by the ONE global maintenance lease (AutomationLock) inside
    // the runner, so ANY concurrent invocation — same tick or not — that loses the lease returns status:'skipped'.
    const tickId = new Date().toISOString().slice(0, 16)
    const result = await runIntelligenceMaintenance({
      tickId,
      deps: createManagedIntelligenceDeps(),
      config: { refreshBatch: 20, reconcileBatch: 200 },
    })
    return NextResponse.json({ ok: true, tickId, ...result })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : 'maintenance failed' },
      { status: 500 },
    )
  }
}
