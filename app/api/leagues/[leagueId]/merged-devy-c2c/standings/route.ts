/**
 * PROMPT 3: C2C standings — unified, separate, or hybrid per league config.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isC2CLeague } from '@/lib/merged-devy-c2c/C2CLeagueConfig'
import { getC2CStandings } from '@/lib/merged-devy-c2c/standings/C2CStandingsService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isC2C = await isC2CLeague(leagueId)
  if (!isC2C) return NextResponse.json({ error: 'Not a C2C league' }, { status: 404 })

  const model = req.nextUrl.searchParams.get('model') as 'unified' | 'separate' | 'hybrid' | null
  const result = await getC2CStandings(leagueId)
  if (model && result.model !== model) {
    const { getC2CUnifiedStandings, getC2CSeparateStandings, getC2CHybridStandings } = await import('@/lib/merged-devy-c2c/standings/C2CStandingsService')
    if (model === 'unified') return NextResponse.json(await getC2CUnifiedStandings(leagueId))
    if (model === 'separate') return NextResponse.json(await getC2CSeparateStandings(leagueId))
    if (model === 'hybrid') return NextResponse.json(await getC2CHybridStandings(leagueId))
  }
  return NextResponse.json(result)
}
