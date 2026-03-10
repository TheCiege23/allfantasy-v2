'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function StandingsTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'standings')

  return (
    <TabDataState title="Standings / Playoffs" loading={loading} error={error} onReload={() => void reload()}>
      <SmartDataView data={data} />
    </TabDataState>
  )
}
