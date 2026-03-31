import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/adminAuth'
import { getLatestSystemHealth, runSystemHealthMonitor } from '@/lib/agents/workers/api-health-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const cached = await getLatestSystemHealth()
    if (cached) {
      return NextResponse.json(cached)
    }

    const snapshot = await runSystemHealthMonitor({ runImports: false, notifyAdmins: false })
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('[api/system/health]', error)
    return NextResponse.json({ error: 'Failed to load system health' }, { status: 500 })
  }
}
