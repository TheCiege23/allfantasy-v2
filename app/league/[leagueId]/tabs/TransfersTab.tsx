'use client'

import type { UserLeague } from '@/app/dashboard/types'
import { LeagueTabPlaceholder } from './LeagueTabPlaceholder'

export function TransfersTab({ league, tabLabel = 'Transfers' }: { league: UserLeague; tabLabel?: string }) {
  return <LeagueTabPlaceholder league={league} tabLabel={tabLabel} />
}
