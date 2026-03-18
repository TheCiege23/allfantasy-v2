/**
 * POST: Zombie AI tools (strategy, advice, recap). PROMPT 355.
 * Deterministic context first; AI narrates/advises only. No infection, legality, or movement decisions.
 * Gated by zombie_ai or ai_chat when subscription is enforced.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isZombieLeague } from '@/lib/zombie/ZombieLeagueConfig'
import { buildZombieAIContext } from '@/lib/zombie/ai/ZombieAIContext'
import type { ZombieAIType } from '@/lib/zombie/ai/ZombieAIContext'
import { generateZombieAI } from '@/lib/zombie/ai/ZombieAIService'

export const dynamic = 'force-dynamic'

const VALID_TYPES: ZombieAIType[] = [
  'survival_strategy',
  'zombie_strategy',
  'whisperer_strategy',
  'serum_timing_advice',
  'weapon_timing_advice',
  'ambush_planning_advice',
  'stay_alive_framing',
  'lineup_zombie_context',
  'weekly_zombie_recap',
  'most_at_risk',
  'chompin_block_explanation',
  'serum_weapon_holders_commentary',
  'whisperer_pressure_summary',
  'commissioner_review_summary',
]

/** Server-side entitlement check. When subscription is wired, resolve from DB/Stripe. */
async function hasZombieAIAccess(userId: string): Promise<boolean> {
  try {
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/subscription/entitlements?feature=zombie_ai`, { headers: { cookie: '' } })
    const data = await res.json().catch(() => ({}))
    if ((data as { hasAccess?: boolean }).hasAccess) return true
    const fallback = await fetch(`${base}/api/subscription/entitlements?feature=ai_chat`, { headers: { cookie: '' } })
    const fallbackData = await fallback.json().catch(() => ({}))
    return Boolean((fallbackData as { hasAccess?: boolean }).hasAccess)
  } catch {
    return false
  }
}

/** Allow AI when entitlements endpoint is not enforcing (same as survivor/guillotine). */
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

  const isZombie = await isZombieLeague(leagueId)
  if (!isZombie) return NextResponse.json({ error: 'Not a zombie league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = (typeof body.type === 'string' ? body.type : 'survival_strategy') as ZombieAIType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type', validTypes: VALID_TYPES }, { status: 400 })
  }

  const week = Math.max(1, parseInt(String(body.week ?? 1), 10) || 1)

  if (!ALLOW_WHEN_ENTITLEMENTS_OPEN) {
    const hasAccess = await hasZombieAIAccess(userId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Premium feature', message: 'Upgrade to access Zombie AI.' },
        { status: 403 }
      )
    }
  }

  const deterministic = await buildZombieAIContext({ leagueId, week, userId })
  if (!deterministic) {
    return NextResponse.json({ error: 'Could not build context' }, { status: 500 })
  }

  try {
    const { narrative, model } = await generateZombieAI(deterministic, type)
    return NextResponse.json({
      deterministic: {
        leagueId: deterministic.leagueId,
        sport: deterministic.sport,
        week: deterministic.week,
        config: deterministic.config,
        whispererRosterId: deterministic.whispererRosterId,
        survivors: deterministic.survivors,
        zombies: deterministic.zombies,
        movementWatch: deterministic.movementWatch,
        rosterDisplayNames: deterministic.rosterDisplayNames,
        myRosterId: deterministic.myRosterId,
        myResources: deterministic.myResources,
        chompinBlockCandidates: deterministic.chompinBlockCandidates,
        collusionFlags: deterministic.collusionFlags,
        dangerousDropFlags: deterministic.dangerousDropFlags,
      },
      narrative,
      model,
      type,
    })
  } catch (e) {
    console.error('[zombie/ai]', e)
    return NextResponse.json(
      { error: 'AI generation failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
