import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runDraftWarRoomRecommendation, type DraftWarRoomInput, type WarRoomPlayer } from '@/lib/ai/aiDraftHelper'
import { assertLeagueAccess } from '@/lib/ai/league-settings-ai/access'
import { getDraftEligiblePositionsFromPayload, getLeagueDraftTemplatePayload } from '@/lib/league/league-draft-template-payload'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  let draftEligibleFromLeague: Set<string> | undefined
  if (leagueId) {
    const league = await assertLeagueAccess(leagueId, session.user.id)
    if (!league) {
      return NextResponse.json({ ok: false, error: 'League not found or forbidden' }, { status: 403 })
    }
    const payload = await getLeagueDraftTemplatePayload(leagueId).catch(() => null)
    if (payload) draftEligibleFromLeague = getDraftEligiblePositionsFromPayload(payload)
  }

  const available = Array.isArray(body.availablePlayers) ? body.availablePlayers : body.available
  if (!Array.isArray(available) || available.length === 0) {
    return NextResponse.json({ ok: false, error: 'availablePlayers required' }, { status: 400 })
  }

  const userRoster = Array.isArray(body.userRoster) ? body.userRoster : []
  const recentPicks = Array.isArray(body.recentPicks) ? body.recentPicks : []
  const rosterSlots = Array.isArray(body.rosterSlots) ? body.rosterSlots : []

  const input: DraftWarRoomInput = {
    leagueSettings: body.leagueSettings && typeof body.leagueSettings === 'object' ? (body.leagueSettings as Record<string, unknown>) : undefined,
    currentPick:
      body.currentPick && typeof body.currentPick === 'object'
        ? (body.currentPick as DraftWarRoomInput['currentPick'])
        : undefined,
    draftType: String(body.draftType ?? 'snake'),
    scoringSettings:
      body.scoringSettings && typeof body.scoringSettings === 'object'
        ? (body.scoringSettings as Record<string, unknown>)
        : undefined,
    userRoster: userRoster as DraftWarRoomInput['userRoster'],
    availablePlayers: (available as WarRoomPlayer[]).map((p: WarRoomPlayer) => ({
      name: String((p as WarRoomPlayer).name ?? ''),
      position: String((p as WarRoomPlayer).position ?? ''),
      team: (p as WarRoomPlayer).team ?? null,
      adp: (p as WarRoomPlayer).adp ?? null,
    })),
    recentPicks: recentPicks as DraftWarRoomInput['recentPicks'],
    nextTeams: Array.isArray(body.nextTeams) ? (body.nextTeams as string[]) : undefined,
    round: Math.max(1, Number(body.round) || 1),
    pickInRound: Math.max(1, Number(body.pick ?? body.pickInRound) || 1),
    totalTeams: Math.max(2, Math.min(32, Number(body.totalTeams) || 12)),
    sport: String(body.sport ?? 'NFL'),
    isDynasty: Boolean(body.isDynasty),
    isSuperflex: Boolean(body.isSuperflex ?? body.isSF),
    rosterSlots: rosterSlots.map(String),
    aiAdpByKey: body.aiAdpByKey && typeof body.aiAdpByKey === 'object' ? (body.aiAdpByKey as Record<string, number>) : undefined,
    mode: body.mode === 'bpa' ? 'bpa' : 'needs',
    ...(draftEligibleFromLeague ? { draftEligiblePositions: draftEligibleFromLeague } : {}),
  }

  try {
    const result = await runDraftWarRoomRecommendation(input)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'War room failed'
    console.error('[api/ai/draft/recommend]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
