'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function PreviousLeaguesTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'history')

  return (
    <TabDataState title="Previous Leagues" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-3">
        <p className="text-xs text-white/60">Archived season and history summary.</p>
        <SmartDataView data={data} />
      </div>
    </TabDataState>
  )
}
