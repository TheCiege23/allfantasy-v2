'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'

export default function OverviewTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'overview')
  const roster = Array.isArray(data?.roster) ? data?.roster : []
  const faab = typeof data?.faabRemaining === 'number' ? data.faabRemaining : '-'

  return (
    <TabDataState title="Overview" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Roster Size" value={roster.length} />
          <MetricCard label="FAAB Remaining" value={faab} />
          <MetricCard label="League" value={leagueId} hint="Current context" />
        </div>
        <SmartDataView data={data} />
      </div>
    </TabDataState>
  )
}
