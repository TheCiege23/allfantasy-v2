/**
 * [NEW] GET: Big Brother AI context (deterministic). POST: Generate AI narrative (host, challenge, recap, game theory, social, finale).
 * PROMPT 4. AI never decides outcomes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { buildBigBrotherAIContext } from '@/lib/big-brother/ai/BigBrotherAIContext'
import { getRosterDisplayNamesForLeague } from '@/lib/big-brother/ai/getRosterDisplayNames'
import type { BigBrotherAIPromptType } from '@/lib/big-brother/ai/BigBrotherAIPrompts'
import { generateBigBrotherAI } from '@/lib/big-brother/ai/BigBrotherAIService'

export const dynamic = 'force-dynamic'

const VALID_TYPES: BigBrotherAIPromptType[] = [
  'chimmy_host',
  'challenge_generator_hoh',
  'challenge_generator_veto',
  'recap',
  'game_theory',
  'social_strategy',
  'finale_moderator',
]

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

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const ctxData = await buildBigBrotherAIContext(leagueId, 'chimmy_host')
  if (!ctxData) return NextResponse.json({ error: 'Could not build context' }, { status: 500 })

  const rosterIds = [
    ctxData.hohRosterId,
    ctxData.nominee1RosterId,
    ctxData.nominee2RosterId,
    ...ctxData.finalNomineeRosterIds,
    ...ctxData.juryRosterIds,
    ...ctxData.eliminatedRosterIds,
  ].filter(Boolean) as string[]
  const rosterDisplayNames = await getRosterDisplayNamesForLeague(leagueId, rosterIds.length ? rosterIds : undefined)

  return NextResponse.json({
    context: ctxData,
    rosterDisplayNames,
    validTypes: VALID_TYPES,
  })
}

export async function POST(
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

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = (body.type ?? 'chimmy_host') as BigBrotherAIPromptType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type', validTypes: VALID_TYPES }, { status: 400 })
  }

  const ctxData = await buildBigBrotherAIContext(leagueId, 'chimmy_host')
  if (!ctxData) return NextResponse.json({ error: 'Could not build context' }, { status: 500 })

  try {
    const { narrative, model } = await generateBigBrotherAI(ctxData, type)
    return NextResponse.json({
      narrative,
      model,
      type,
      context: ctxData,
    })
  } catch (e) {
    console.error('[big-brother/ai]', e)
    return NextResponse.json(
      { error: 'AI generation failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
