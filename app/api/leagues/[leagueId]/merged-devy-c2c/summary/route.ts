/**
 * GET: Merged Devy / C2C league summary for Overview/C2C Home. PROMPT 2/6.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isC2CLeague, getC2CConfig } from '@/lib/merged-devy-c2c/C2CLeagueConfig'
import { getCurrentC2CDraftPhase } from '@/lib/merged-devy-c2c/draft/C2CDraftOrchestration'

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

  const isC2C = await isC2CLeague(leagueId)
  if (!isC2C) return NextResponse.json({ error: 'Not a C2C / Merged Devy league' }, { status: 404 })

  const [config, draftPhase] = await Promise.all([
    getC2CConfig(leagueId),
    getCurrentC2CDraftPhase(leagueId),
  ])

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

  return NextResponse.json({
    leagueId,
    sport: config.sport,
    sportAdapterId: config.sportAdapterId,
    config: {
      startupFormat: config.startupFormat,
      mergedStartupDraft: config.mergedStartupDraft,
      separateStartupCollegeDraft: config.separateStartupCollegeDraft,
      collegeRosterSize: config.collegeRosterSize,
      collegeActiveLineupSlots: config.collegeActiveLineupSlots,
      taxiSize: config.taxiSize,
      rookieDraftRounds: config.rookieDraftRounds,
      collegeDraftRounds: config.collegeDraftRounds,
      bestBallPro: config.bestBallPro,
      bestBallCollege: config.bestBallCollege,
      standingsModel: config.standingsModel,
      mergedRookieCollegeDraft: config.mergedRookieCollegeDraft,
      startupDraftType: config.startupDraftType,
      rookieDraftType: config.rookieDraftType,
      collegeDraftType: config.collegeDraftType,
    },
    draftPhase: draftPhase.phase,
    draftPhaseInfo: draftPhase.phaseInfo,
    sessionId: draftPhase.sessionId,
  })
}
