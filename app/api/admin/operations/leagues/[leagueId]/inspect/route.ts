import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { buildLeagueInspectSnapshot } from '@/lib/admin/operations/leagueInspectService'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const { leagueId } = await ctx.params
  try {
    const snapshot = await buildLeagueInspectSnapshot(leagueId)
    if (!snapshot) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }
    return NextResponse.json({ data: snapshot })
  } catch (e) {
    console.error('[admin/operations/inspect]', e)
    return NextResponse.json({ error: 'Inspect failed' }, { status: 500 })
  }
}
