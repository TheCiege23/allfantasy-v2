'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'

export default function TeamTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'team')
  const roster = Array.isArray(data?.roster) ? data.roster : []

  return (
    <TabDataState title="Team" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Players" value={roster.length} />
          <MetricCard label="Team Context" value={leagueId} hint="Linked to active league" />
        </div>
        <SmartDataView data={data} />
      </div>
    </TabDataState>
  )
}
