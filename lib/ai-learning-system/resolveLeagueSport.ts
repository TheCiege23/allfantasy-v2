import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

export async function resolveLeagueSport(leagueId: string): Promise<SupportedSport> {
  const row = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  return normalizeToSupportedSport(row?.sport ?? undefined)
}
