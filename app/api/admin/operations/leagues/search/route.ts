import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { searchLeaguesForAdmin } from '@/lib/admin/operations/leagueInspectService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!q) {
    return NextResponse.json({ data: [] })
  }

  try {
    const data = await searchLeaguesForAdmin({ q, limit: 30 })
    return NextResponse.json({ data })
  } catch (e) {
    console.error('[admin/operations/leagues/search]', e)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
