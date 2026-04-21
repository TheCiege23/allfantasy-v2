import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductInsights } from '@/lib/analytics/productInsights'
import { withApiUsage } from '@/lib/telemetry/usage'

export const dynamic = 'force-dynamic'

function asInt(v: string | null, def: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.floor(n) : def
}

export const GET = withApiUsage({ endpoint: '/api/admin/analytics/product-insights', tool: 'AdminProductInsights' })(
  async (request: NextRequest) => {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.res

    const { searchParams } = new URL(request.url)
    const days = Math.min(365, Math.max(1, asInt(searchParams.get('days'), 30)))
    const until = new Date()
    const since = new Date(until.getTime() - days * 86400000)

    try {
      const data = await getProductInsights({ since, until })
      return NextResponse.json(data)
    } catch (e) {
      console.error('[admin/analytics/product-insights]', e)
      return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 })
    }
  },
)
