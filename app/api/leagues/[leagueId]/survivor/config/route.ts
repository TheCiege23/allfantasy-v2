/**
 * GET/PUT: Survivor league config. PROMPT 349 QA — commissioner or league member can read; only commissioner can write.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { isSurvivorLeague, getSurvivorConfig, upsertSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'

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

  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return NextResponse.json({ error: 'Not a survivor league' }, { status: 404 })

  const config = await getSurvivorConfig(leagueId)
  if (!config) return NextResponse.json({ config: null })

  return NextResponse.json({
    config: {
      mode: config.mode,
      tribeCount: config.tribeCount,
      tribeSize: config.tribeSize,
      tribeFormation: config.tribeFormation,
      mergeTrigger: config.mergeTrigger,
      mergeWeek: config.mergeWeek,
      mergePlayerCount: config.mergePlayerCount,
      juryStartAfterMerge: config.juryStartAfterMerge,
      exileReturnEnabled: config.exileReturnEnabled,
      exileReturnTokens: config.exileReturnTokens,
      idolCount: config.idolCount,
      voteDeadlineDayOfWeek: config.voteDeadlineDayOfWeek,
      voteDeadlineTimeUtc: config.voteDeadlineTimeUtc,
      selfVoteDisallowed: config.selfVoteDisallowed,
    },
  })
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const commissioner = await isCommissioner(leagueId, userId)
  if (!commissioner) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return NextResponse.json({ error: 'Not a survivor league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const updated = await upsertSurvivorConfig(leagueId, {
    ...(body.mode != null && { mode: String(body.mode) }),
    ...(body.tribeCount != null && { tribeCount: Number(body.tribeCount) }),
    ...(body.tribeSize != null && { tribeSize: Number(body.tribeSize) }),
    ...(body.tribeFormation != null && { tribeFormation: String(body.tribeFormation) }),
    ...(body.mergeTrigger != null && { mergeTrigger: String(body.mergeTrigger) }),
    ...(body.mergeWeek != null && { mergeWeek: Number(body.mergeWeek) }),
    ...(body.mergePlayerCount != null && { mergePlayerCount: Number(body.mergePlayerCount) }),
    ...(body.juryStartAfterMerge != null && { juryStartAfterMerge: Number(body.juryStartAfterMerge) }),
    ...(body.exileReturnEnabled != null && { exileReturnEnabled: Boolean(body.exileReturnEnabled) }),
    ...(body.exileReturnTokens != null && { exileReturnTokens: Number(body.exileReturnTokens) }),
    ...(body.idolCount != null && { idolCount: Number(body.idolCount) }),
    ...(body.voteDeadlineDayOfWeek != null && { voteDeadlineDayOfWeek: Number(body.voteDeadlineDayOfWeek) }),
    ...(body.voteDeadlineTimeUtc != null && { voteDeadlineTimeUtc: String(body.voteDeadlineTimeUtc) }),
    ...(body.selfVoteDisallowed != null && { selfVoteDisallowed: Boolean(body.selfVoteDisallowed) }),
  })
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ ok: true, config: updated })
}
