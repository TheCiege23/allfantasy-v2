/**
 * GET: Zombie universe standings (all leagues, status, points, winnings, movement). PROMPT 353.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUniverseStandings } from '@/lib/zombie/ZombieUniverseStandingsService'
import { getMovementProjections } from '@/lib/zombie/ZombieMovementEngine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
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

  const [standings, movement] = await Promise.all([
    getUniverseStandings(universeId, season),
    getMovementProjections(universeId, season),
  ])

  return NextResponse.json({
    universeId,
    season: season ?? new Date().getFullYear(),
    standings,
    movementProjections: movement,
  })
}
