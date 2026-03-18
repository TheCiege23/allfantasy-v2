/**
 * GET: List zombie universes the user can access (member of at least one league in the universe).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myOwnedLeagues = await prisma.league.findMany({
    where: { userId },
    select: { id: true },
  })
  const myRosters = await prisma.roster.findMany({
    where: { platformUserId: userId },
    select: { leagueId: true },
  })
  const myLeagueIds = new Set([
    ...myOwnedLeagues.map((l) => l.id),
    ...myRosters.map((r) => r.leagueId),
  ])

  const zombieLeagues = await prisma.zombieLeague.findMany({
    where: { leagueId: { in: [...myLeagueIds] } },
    select: { universeId: true, universe: { select: { id: true, name: true, sport: true } } },
  })

  const byUniverse = new Map<string, { id: string; name: string; sport: string }>()
  for (const zl of zombieLeagues) {
    if (zl.universe && !byUniverse.has(zl.universeId)) {
      byUniverse.set(zl.universeId, {
        id: zl.universe.id,
        name: zl.universe.name,
        sport: zl.universe.sport,
      })
    }
  }

  const universes = [...byUniverse.values()]
  return NextResponse.json({ universes })
}
