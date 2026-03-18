/**
 * GET: Devy Dynasty league summary for Overview/DevyHome. PROMPT 2/6.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isDevyLeague, getDevyConfig } from '@/lib/devy/DevyLeagueConfig'
import { getCurrentDraftPhase } from '@/lib/devy/draft/DevyDraftOrchestration'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isDevy = await isDevyLeague(leagueId)
  if (!isDevy) return NextResponse.json({ error: 'Not a devy dynasty league' }, { status: 404 })

  const [config, draftPhase] = await Promise.all([
    getDevyConfig(leagueId),
    getCurrentDraftPhase(leagueId),
  ])

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

  return NextResponse.json({
    leagueId,
    sport: config.sport,
    sportAdapterId: config.sportAdapterId,
    config: {
      devySlotCount: config.devySlotCount,
      taxiSize: config.taxiSize,
      rookieDraftRounds: config.rookieDraftRounds,
      devyDraftRounds: config.devyDraftRounds,
      bestBallEnabled: config.bestBallEnabled,
      startupDraftType: config.startupDraftType,
      rookieDraftType: config.rookieDraftType,
      devyDraftType: config.devyDraftType,
    },
    draftPhase: draftPhase.phase,
    draftPhaseInfo: draftPhase.phaseInfo,
    sessionId: draftPhase.sessionId,
  })
}
