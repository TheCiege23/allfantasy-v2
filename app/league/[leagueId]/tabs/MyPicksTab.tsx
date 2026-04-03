'use client'

import type { UserLeague } from '@/app/dashboard/types'
import { LeagueTabPlaceholder } from './LeagueTabPlaceholder'

export function MyPicksTab({ league, tabLabel = 'My Picks' }: { league: UserLeague; tabLabel?: string }) {
  return <LeagueTabPlaceholder league={league} tabLabel={tabLabel} />
}
