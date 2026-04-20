import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildMatchupCenterPayload } from '@/server/services/matchupCenterService'
import { assertValidMatchupPayload } from '@/lib/matchup-center/validateMatchupPayload'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params
  const sp = req.nextUrl.searchParams
  const season = sp.get('season') ? Number(sp.get('season')) : undefined
  const week = sp.get('week') ? Number(sp.get('week')) : undefined

  const out = await buildMatchupCenterPayload({
    leagueId,
    viewerUserId: session.user.id,
    season: Number.isFinite(season!) ? season : undefined,
    week: Number.isFinite(week!) ? week : undefined,
  })

  if ('error' in out) {
    return NextResponse.json({ error: out.error }, { status: out.status })
  }

  const v = assertValidMatchupPayload(out)
  if (!v.ok) {
    console.warn('[matchup-center] payload validation', v.errors)
  }

  return NextResponse.json({ payload: out, validation: v })
}
