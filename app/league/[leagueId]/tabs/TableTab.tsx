'use client'

import type { UserLeague } from '@/app/dashboard/types'
import { LeagueTabPlaceholder } from './LeagueTabPlaceholder'

export function TableTab({ league, tabLabel = 'Table' }: { league: UserLeague; tabLabel?: string }) {
  return <LeagueTabPlaceholder league={league} tabLabel={tabLabel} />
}
