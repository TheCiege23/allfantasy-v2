import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'
import { buildPostDraftReportStub } from '@/lib/war-room/war-room-deterministic'
import { logAiRecommendation } from '@/lib/war-room/war-room-persist'
import { rememberPostDraftHandoff } from '@/lib/war-room/war-room-memory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/post-draft-report — summary from `draft_picks` + stub grade (Trade Finder / Chimmy hooks).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const draftSessionId = typeof body.draftSessionId === 'string' ? body.draftSessionId : ''
  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'report')
  if (!gate.ok) return gate.response

  if (!draftSessionId) {
    return NextResponse.json({ error: 'draftSessionId is required' }, { status: 400 })
  }

  const session = await prisma.draftSession.findFirst({
    where: { id: draftSessionId, leagueId: gate.ctx.leagueId },
    select: { id: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Draft session not found for this league' }, { status: 404 })
  }

  const rosterId = typeof body.rosterId === 'string' ? body.rosterId : undefined
  const pickRows = await prisma.draftPick.findMany({
    where: { sessionId: session.id, ...(rosterId ? { rosterId } : {}) },
    orderBy: { overall: 'asc' },
    take: 80,
    select: { round: true, playerName: true, position: true },
  })

  const report = buildPostDraftReportStub({
    sport: gate.ctx.sport,
    picks: pickRows.map((p) => ({
      round: p.round,
      playerName: p.playerName,
      position: p.position,
    })),
  })

  const log = await logAiRecommendation({
    userId: auth.userId,
    leagueId: gate.ctx.leagueId,
    draftSessionId: session.id,
    feature: 'war_room_post_draft_report',
    recommendationType: 'post_draft',
    inputJson: body as object,
    outputJson: report as object,
    providerSummary: 'post_draft_stub',
  })

  const leagueIdEnc = encodeURIComponent(gate.ctx.leagueId)
  const tradeFinderLink = `/trade-evaluator?leagueId=${leagueIdEnc}`
  const waiverAiLink = `/waiver-ai?leagueId=${leagueIdEnc}`
  const chimmyLink = `/chimmy/chat?leagueId=${leagueIdEnc}`

  await rememberPostDraftHandoff({
    userId: auth.userId,
    leagueId: gate.ctx.leagueId,
    sport: gate.ctx.sport,
    draftSessionId: session.id,
    summary: {
      headline: report.headline,
      grade: report.grade,
      bullets: report.bullets,
      waiverWatchlist: [],
      tradeTargets: [],
    },
    links: {
      tradeFinder: tradeFinderLink,
      waiverAi: waiverAiLink,
      chimmy: chimmyLink,
    },
  })

  return NextResponse.json({
    ok: true,
    report,
    pickCount: pickRows.length,
    logId: log.id,
    tradeFinderLink,
    waiverAiLink,
    chimmyLink,
  })
}
