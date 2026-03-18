/**
 * POST: Guillotine AI — strategy and explanation only. Deterministic data returned first; AI explains.
 * PROMPT 334: No AI for elimination, standings, tiebreak, or waiver execution.
 * Gated by entitlement (guillotine_ai or ai_chat when subscription is enforced).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isGuillotineLeague } from '@/lib/guillotine/GuillotineLeagueConfig'
import { buildGuillotineAIContext } from '@/lib/guillotine/ai/GuillotineAIContext'
import { generateGuillotineAI } from '@/lib/guillotine/ai/GuillotineAIService'
import type { GuillotineAIType } from '@/lib/guillotine/ai/GuillotineAIService'
import type { SubscriptionFeatureId } from '@/lib/subscription/types'

export const dynamic = 'force-dynamic'

/** Server-side entitlement check. When subscription is wired, resolve from DB/Stripe. */
async function hasGuillotineAIAccess(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/subscription/entitlements?feature=guillotine_ai`,
      { headers: { cookie: '' } }
    )
    const data = await res.json().catch(() => ({}))
    if (data.hasAccess) return true
    const fallback = await fetch(
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/subscription/entitlements?feature=ai_chat`,
      { headers: { cookie: '' } }
    )
    const fallbackData = await fallback.json().catch(() => ({}))
    return Boolean(fallbackData.hasAccess)
  } catch {
    return false
  }
}

/** For now: allow AI if entitlements endpoint is not enforcing (hasAccess false for everyone). Remove when subscription is enforced. */
const ALLOW_WHEN_ENTITLEMENTS_OPEN = true

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

  const isGuillotine = await isGuillotineLeague(leagueId)
  if (!isGuillotine) return NextResponse.json({ error: 'Not a guillotine league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = (body.type ?? 'survival') as GuillotineAIType
  const validTypes: GuillotineAIType[] = ['draft', 'survival', 'waiver', 'recap', 'orphan']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const weekOrPeriod = Math.max(1, parseInt(String(body.week ?? body.weekOrPeriod ?? 1), 10) || 1)
  const userRosterId = body.userRosterId ?? undefined

  if (!ALLOW_WHEN_ENTITLEMENTS_OPEN) {
    const hasAccess = await hasGuillotineAIAccess(userId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Premium feature', message: 'Upgrade to access Guillotine AI.' },
        { status: 403 }
      )
    }
  }

  const deterministic = await buildGuillotineAIContext({
    leagueId,
    weekOrPeriod,
    type,
    userRosterId,
  })
  if (!deterministic) {
    return NextResponse.json({ error: 'Could not build context' }, { status: 500 })
  }

  try {
    const { explanation, model } = await generateGuillotineAI(deterministic, type)
    return NextResponse.json({
      deterministic: {
        leagueId: deterministic.leagueId,
        sport: deterministic.sport,
        weekOrPeriod: deterministic.weekOrPeriod,
        survivalStandings: deterministic.survivalStandings,
        dangerTiers: deterministic.dangerTiers,
        recentChopEvents: deterministic.recentChopEvents,
        choppedThisWeek: deterministic.choppedThisWeek,
        config: deterministic.config,
        releasedPlayerIds: deterministic.releasedPlayerIds,
      },
      explanation,
      model,
      type,
    })
  } catch (e) {
    console.error('[guillotine/ai]', e)
    return NextResponse.json(
      { error: 'AI generation failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
