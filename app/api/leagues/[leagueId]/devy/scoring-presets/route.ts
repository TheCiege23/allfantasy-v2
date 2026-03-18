/**
 * PROMPT 4: Devy scoring presets (Half-PPR, Full PPR, TE premium, Superflex for NFL; Points for NBA).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isDevyLeague, getDevyScoringPresets } from '@/lib/devy'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isDevy = await isDevyLeague(leagueId)
  if (!isDevy) return NextResponse.json({ error: 'Not a devy league' }, { status: 404 })

  const sport = (req.nextUrl.searchParams.get('sport') ?? 'NFL').toUpperCase() as 'NFL' | 'NBA'
  const presets = getDevyScoringPresets(sport)
  return NextResponse.json({ sport, presets })
}
