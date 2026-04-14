import 'server-only'

import type { LeagueSport } from '@prisma/client'

import { apiChain } from '@/lib/workers/api-chain'
import { legacySupportedSportToApiChain } from '@/lib/workers/api-config'

/**
 * After league creation, warm Rolling Insights–backed chain caches (teams, schedule, injuries)
 * so the league shell has DB-first sports data without waiting for first user navigation.
 */
export async function warmLeagueSportsDataAfterCreate(leagueSport: LeagueSport): Promise<void> {
  const chain = legacySupportedSportToApiChain(leagueSport as never)
  await Promise.allSettled([
    apiChain.fetch({ sport: chain, dataType: 'teams' }),
    apiChain.fetch({ sport: chain, dataType: 'schedule' }),
    apiChain.fetch({ sport: chain, dataType: 'injuries' }),
  ])
}
