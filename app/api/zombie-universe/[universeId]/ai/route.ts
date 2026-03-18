/**
 * POST: Zombie Universe AI (promotion/relegation outlook, level storylines, etc.). PROMPT 355.
 * Deterministic context first; AI narrates only. No promotion/relegation decisions.
 * Gated by zombie_ai or ai_chat when subscription is enforced.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildZombieUniverseAIContext } from '@/lib/zombie/ai/ZombieAIContext'
import type { ZombieUniverseAIType } from '@/lib/zombie/ai/ZombieAIContext'
import { generateZombieUniverseAI } from '@/lib/zombie/ai/ZombieAIService'

export const dynamic = 'force-dynamic'

const VALID_TYPES: ZombieUniverseAIType[] = [
  'promotion_relegation_outlook',
  'level_storylines',
  'top_survivor_runs',
  'fastest_spread_analysis',
  'league_health_summary',
  'commissioner_anomaly_summary',
]

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

const ALLOW_WHEN_ENTITLEMENTS_OPEN = true

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ universeId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { universeId } = await ctx.params
  if (!universeId) return NextResponse.json({ error: 'Missing universeId' }, { status: 400 })

  const universe = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    select: { id: true, sport: true },
  })
  if (!universe) return NextResponse.json({ error: 'Universe not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = (typeof body.type === 'string' ? body.type : 'promotion_relegation_outlook') as ZombieUniverseAIType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type', validTypes: VALID_TYPES }, { status: 400 })
  }

  if (!ALLOW_WHEN_ENTITLEMENTS_OPEN) {
    const hasAccess = await hasZombieAIAccess(userId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Premium feature', message: 'Upgrade to access Zombie Universe AI.' },
        { status: 403 }
      )
    }
  }

  const deterministic = await buildZombieUniverseAIContext({ universeId, userId })
  if (!deterministic) {
    return NextResponse.json({ error: 'Could not build context' }, { status: 500 })
  }

  try {
    const { narrative, model } = await generateZombieUniverseAI(deterministic, type)
    return NextResponse.json({
      deterministic: {
        universeId: deterministic.universeId,
        sport: deterministic.sport,
        standings: deterministic.standings.slice(0, 50),
        movementProjections: deterministic.movementProjections.slice(0, 30),
        rosterDisplayNames: deterministic.rosterDisplayNames,
      },
      narrative,
      model,
      type,
    })
  } catch (e) {
    console.error('[zombie-universe/ai]', e)
    return NextResponse.json(
      { error: 'AI generation failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
