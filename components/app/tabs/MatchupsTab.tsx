'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function MatchupsTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'matchups')

  return (
    <TabDataState title="Matchups" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-3">
        <p className="text-xs text-white/60">Live matchup feed and recent league events.</p>
        <SmartDataView data={(data as any)?.events ?? data} />
      </div>
    </TabDataState>
  )
}
