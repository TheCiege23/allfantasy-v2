/**
 * GET: Mock draft settings (pre_draft only or any for read).
 * PATCH: Update mock draft settings (pre_draft only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMockDraftSettings, updateMockDraftSettings } from '@/lib/mock-draft-engine/MockSettingsService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const settings = await getMockDraftSettings(draftId, userId ?? undefined)
  if (!settings) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  return NextResponse.json({ draftId, settings })
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const ok = await updateMockDraftSettings(draftId, userId, {
    sport: body.sport,
    leagueType: body.leagueType,
    draftType: body.draftType,
    numTeams: body.numTeams,
    rounds: body.rounds,
    timerSeconds: body.timerSeconds,
    aiEnabled: body.aiEnabled,
    scoringFormat: body.scoringFormat,
    leagueId: body.leagueId,
    rosterSize: body.rosterSize,
    poolType: body.poolType,
    roomMode: body.roomMode,
    humanTeams: body.humanTeams,
    keepersEnabled: body.keepersEnabled,
    keepers: body.keepers,
    slotConfig: body.slotConfig,
  })
  if (!ok) return NextResponse.json({ error: 'Draft not found or not editable' }, { status: 400 })
  const settings = await getMockDraftSettings(draftId, userId)
  return NextResponse.json({ ok: true, draftId, settings })
}
