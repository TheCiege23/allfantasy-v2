'use client'

import type { UserLeague } from '@/app/dashboard/types'
import { LeagueTabPlaceholder } from './LeagueTabPlaceholder'

export function ScheduleTab({ league, tabLabel = 'Schedule' }: { league: UserLeague; tabLabel?: string }) {
  return <LeagueTabPlaceholder league={league} tabLabel={tabLabel} />
}
