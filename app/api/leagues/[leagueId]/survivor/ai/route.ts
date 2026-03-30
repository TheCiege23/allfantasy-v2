/**
 * POST: Survivor AI — host posts and helper strategy. Deterministic context first; AI narrates/advises only.
 * PROMPT 348: No AI for elimination, vote count, idol validity, immunity, or exile return.
 * Gated by entitlement survivor_ai or ai_chat when subscription is enforced.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isSurvivorLeague } from '@/lib/survivor/SurvivorLeagueConfig'
import { buildSurvivorAIContext } from '@/lib/survivor/ai/SurvivorAIContext'
import type { SurvivorAIType } from '@/lib/survivor/ai/SurvivorAIContext'
import { generateSurvivorAI } from '@/lib/survivor/ai/SurvivorAIService'
import { resolveSurvivorCurrentWeek } from '@/lib/survivor/SurvivorTimelineResolver'
import {
  FeatureGateService,
  isFeatureGateAccessError,
} from '@/lib/subscription/FeatureGateService'

export const dynamic = 'force-dynamic'

const VALID_TYPES: SurvivorAIType[] = [
  'host_intro',
  'host_challenge',
  'host_merge',
  'host_council',
  'host_scroll',
  'host_jury',
  'tribe_help',
  'idol_help',
  'tribal_help',
  'exile_help',
  'bestball_help',
]

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = new FeatureGateService()
  try {
    await gate.assertUserHasFeature(userId, 'survivor_ai')
  } catch (error) {
    if (isFeatureGateAccessError(error)) {
      return NextResponse.json(
        {
          error: 'Premium feature',
          message: error.message,
          code: error.code,
          requiredPlan: error.requiredPlan,
          upgradePath: error.upgradePath,
        },
        { status: error.statusCode }
      )
    }
    throw error
  }

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return NextResponse.json({ error: 'Not a survivor league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = (body.type ?? 'tribe_help') as SurvivorAIType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type', validTypes: VALID_TYPES }, { status: 400 })
  }
  const requestedWeekRaw = body.week ?? body.currentWeek ?? null
  const requestedWeek =
    requestedWeekRaw != null ? Math.max(1, parseInt(String(requestedWeekRaw), 10) || 1) : null
  const currentWeek = await resolveSurvivorCurrentWeek(leagueId, requestedWeek)

  const deterministic = await buildSurvivorAIContext({
    leagueId,
    currentWeek,
    userId,
  })
  if (!deterministic) {
    return NextResponse.json({ error: 'Could not build context' }, { status: 500 })
  }

  try {
    const { narrative, model } = await generateSurvivorAI(deterministic, type)
    return NextResponse.json({
      deterministic: {
        leagueId: deterministic.leagueId,
        sport: deterministic.sport,
        currentWeek: deterministic.currentWeek,
        config: deterministic.config,
        tribes: deterministic.tribes,
        council: deterministic.council
          ? {
              id: deterministic.council.id,
              week: deterministic.council.week,
              phase: deterministic.council.phase,
              attendingTribeId: deterministic.council.attendingTribeId,
              voteDeadlineAt: deterministic.council.voteDeadlineAt.toISOString(),
              closedAt: deterministic.council.closedAt?.toISOString() ?? null,
              eliminatedRosterId: deterministic.council.eliminatedRosterId,
            }
          : null,
        challenges: deterministic.challenges,
        jury: deterministic.jury,
        exileLeagueId: deterministic.exileLeagueId,
        exileTokens: deterministic.exileTokens,
        votedOutHistory: deterministic.votedOutHistory,
        merged: deterministic.merged,
        rosterDisplayNames: deterministic.rosterDisplayNames,
        myRosterId: deterministic.myRosterId,
        myIdols: deterministic.myIdols,
        myActiveEffects: deterministic.myActiveEffects,
        myExileStatus: deterministic.myExileStatus,
        finale: deterministic.finale,
      },
      narrative,
      model,
      type,
    })
  } catch (e) {
    console.error('[survivor/ai]', e)
    return NextResponse.json(
      { error: 'AI generation failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
