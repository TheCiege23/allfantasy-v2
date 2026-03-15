'use client'

import Link from 'next/link'
import { Radio } from 'lucide-react'
import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'
import { LeagueDramaWidget } from '@/components/app/league/LeagueDramaWidget'

export default function OverviewTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'overview')
  const roster = Array.isArray(data?.roster) ? data?.roster : []
  const faab = typeof data?.faabRemaining === 'number' ? data.faabRemaining : '-'
  const sport = (data as { sport?: string })?.sport
  const season = (data as { season?: number })?.season

  return (
    <TabDataState title="Overview" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-3 sm:grid-cols-3 flex-1 min-w-0">
          <MetricCard label="Roster Size" value={roster.length} />
          <MetricCard label="FAAB Remaining" value={faab} />
          <MetricCard label="League" value={leagueId} hint="Current context" />
          </div>
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}/broadcast`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-950/50"
          >
            <Radio className="h-4 w-4" /> Launch broadcast
          </Link>
        </div>
        <LeagueDramaWidget leagueId={leagueId} sport={sport} season={season} />
        <SmartDataView data={data} />
      </div>
    </TabDataState>
  )
}
