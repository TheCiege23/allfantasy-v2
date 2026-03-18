/**
 * POST: Refresh universe movement projections (promotion/relegation watch). PROMPT 356.
 * Recomputes standings and upserts ZombieMovementProjection per roster.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshMovementProjections } from '@/lib/zombie/ZombieUniverseProjectionService'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ universeId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { universeId } = await ctx.params
  if (!universeId) return NextResponse.json({ error: 'Missing universeId' }, { status: 400 })

  const universe = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    select: { id: true },
  })
  if (!universe) return NextResponse.json({ error: 'Universe not found' }, { status: 404 })

  const seasonParam = typeof _req.url === 'string' ? new URL(_req.url).searchParams.get('season') : null
  const season = seasonParam ? parseInt(seasonParam, 10) : undefined

  try {
    await refreshMovementProjections(universeId, season)
    return NextResponse.json({ ok: true, universeId, season: season ?? new Date().getFullYear() })
  } catch (e) {
    console.error('[zombie-universe/refresh]', e)
    return NextResponse.json(
      { error: 'Refresh failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
