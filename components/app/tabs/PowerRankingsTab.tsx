'use client'

import type { LeagueTabProps } from '@/components/app/tabs/types'
import { PowerRankingsPage } from '@/components/app/power-rankings/PowerRankingsPage'

export default function PowerRankingsTab({ leagueId }: LeagueTabProps) {
  return <PowerRankingsPage leagueId={leagueId} />
}
