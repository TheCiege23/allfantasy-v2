/**
 * [NEW] IDP league config: GET (any member) / PATCH (commissioner only).
 * PROMPT 2/6.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getIdpLeagueConfig, isIdpLeague, upsertIdpLeagueConfig, getRosterDefaultsForIdpLeague } from '@/lib/idp'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  const [config, rosterDefaults] = await Promise.all([
    getIdpLeagueConfig(leagueId),
    getRosterDefaultsForIdpLeague(leagueId),
  ])
  if (!config) return NextResponse.json({ config: null })

  const rosterPreview =
    rosterDefaults?.starter_slots != null
      ? {
          starterSlots: rosterDefaults.starter_slots,
          benchSlots: rosterDefaults.bench_slots ?? config.benchSlots,
          irSlots: rosterDefaults.IR_slots ?? config.irSlots,
        }
      : null

  return NextResponse.json({
    config: {
      positionMode: config.positionMode,
      rosterPreset: config.rosterPreset,
      slotOverrides: config.slotOverrides,
      scoringPreset: config.scoringPreset,
      bestBallEnabled: config.bestBallEnabled,
      draftType: config.draftType,
      benchSlots: config.benchSlots,
      irSlots: config.irSlots,
    },
    rosterPreview,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await assertCommissioner(leagueId, session.user.id)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const updated = await upsertIdpLeagueConfig(leagueId, {
    positionMode: typeof body.positionMode === 'string' ? body.positionMode : undefined,
    rosterPreset: typeof body.rosterPreset === 'string' ? body.rosterPreset : undefined,
    slotOverrides: body.slotOverrides != null ? (body.slotOverrides as object) : undefined,
    scoringPreset: typeof body.scoringPreset === 'string' ? body.scoringPreset : undefined,
    bestBallEnabled: typeof body.bestBallEnabled === 'boolean' ? body.bestBallEnabled : undefined,
    draftType: typeof body.draftType === 'string' ? body.draftType : undefined,
    benchSlots: typeof body.benchSlots === 'number' ? body.benchSlots : undefined,
    irSlots: typeof body.irSlots === 'number' ? body.irSlots : undefined,
  })
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({
    config: {
      positionMode: updated.positionMode,
      rosterPreset: updated.rosterPreset,
      slotOverrides: updated.slotOverrides,
      scoringPreset: updated.scoringPreset,
      bestBallEnabled: updated.bestBallEnabled,
      draftType: updated.draftType,
      benchSlots: updated.benchSlots,
      irSlots: updated.irSlots,
    },
  })
}
