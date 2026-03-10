'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'

export default function RosterTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'roster')
  const roster = Array.isArray(data?.roster) ? data.roster : []

  return (
    <TabDataState title="Roster" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Total Players" value={roster.length} />
          <MetricCard label="FAAB" value={(data as any)?.faabRemaining ?? '-'} />
          <MetricCard label="League" value={leagueId} />
        </div>
        <SmartDataView data={roster.length ? roster : data} />
      </div>
    </TabDataState>
  )
}
