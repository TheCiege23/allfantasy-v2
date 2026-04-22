/**
 * POST — Optional async HeyGen narration stub for Round 1 picks only.
 * Never blocks drafting: pick is already persisted; this route only starts a HeyGen job when configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { getDraftSessionByLeague } from '@/lib/live-draft-engine/DraftSessionService'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { prisma } from '@/lib/prisma'
import { createHeyGenVideo, isHeyGenConfigured } from '@/lib/fantasy-media/HeyGenVideoService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const sessionAuth = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = sessionAuth?.user?.id
  if (!userId) return NextResponse.json({ ok: false, skipped: true, reason: 'unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ ok: false, skipped: true, reason: 'missing_league' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ ok: false, skipped: true, reason: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const pickId = typeof body.pickId === 'string' ? body.pickId.trim() : ''

  const [draftSession, uiSettings, league] = await Promise.all([
    getDraftSessionByLeague(leagueId),
    getDraftUISettingsForLeague(leagueId),
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true, sport: true },
    }),
  ])

  if (!draftSession || draftSession.status !== 'in_progress') {
    return NextResponse.json({ ok: false, skipped: true, reason: 'draft_not_live' })
  }

  if (!uiSettings.roundOneHeyGenHighlightEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: 'feature_off' })
  }

  if (!isHeyGenConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: 'heygen_not_configured' })
  }

  const pick = (draftSession.picks ?? []).find((p) => p.id === pickId)
  if (!pick || pick.round !== 1) {
    return NextResponse.json({ ok: false, skipped: true, reason: 'invalid_pick' }, { status: 400 })
  }

  const leagueName = league?.name?.trim() || 'Fantasy league'
  const sport = String(league?.sport ?? 'nfl').toLowerCase()
  const mgr = pick.displayName?.trim() || 'Team'
  const teamBit = pick.team ? `${pick.team}. ` : ''
  const script = [
    `Round one, pick ${pick.slot}, ${pick.overall} overall.`,
    `${mgr} selects ${pick.playerName}, ${pick.position}. ${teamBit}`,
    `Live from ${leagueName}.`,
  ].join(' ')

  const title = `${leagueName.slice(0, 80)} · R1 · ${pick.playerName}`.slice(0, 200)

  const created = await createHeyGenVideo({
    title,
    sport,
    contentType: 'player_spotlight',
    script,
    language: 'en',
  })

  if (!created) {
    return NextResponse.json({ ok: false, skipped: true, reason: 'heygen_create_failed' })
  }

  return NextResponse.json({
    ok: true,
    videoId: created.videoId,
    skipped: false,
  })
}
