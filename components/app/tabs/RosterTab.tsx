'use client'

import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard } from '@/components/app/league/SmartDataView'
import RosterBoard from '@/components/app/roster/RosterBoard'
import RosterLegacyReport from '@/app/components/RosterLegacyReport'

export default function RosterTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } =
    useLeagueSectionData<Record<string, unknown>>(leagueId, 'roster')
  const rosterArray = Array.isArray((data as any)?.roster) ? ((data as any).roster as any[]) : []
  const faabRemaining = (data as any)?.faabRemaining ?? '-'
  const waiverPriority = (data as any)?.waiverPriority ?? null

  return (
    <TabDataState title="Roster" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Total Players" value={rosterArray.length} />
          <MetricCard label="FAAB" value={faabRemaining} />
          <MetricCard
            label="Waiver priority"
            value={waiverPriority != null ? waiverPriority : '—'}
            hint="Lower is earlier in rolling waivers."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <RosterBoard leagueId={leagueId} />
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
              <p className="font-semibold text-xs">Flexible roster enforcement</p>
              <p className="mt-1">
                This lineup view lets you organize starters, bench, IR, taxi, and devy locally. Platform
                lineup locks still apply in your host app; AllFantasy will sync deeper integration as
                league APIs evolve.
              </p>
            </div>
            <RosterLegacyReport leagueId={leagueId} />
          </div>
        </div>
      </div>
    </TabDataState>
  )
}

