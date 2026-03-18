'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Radio, BookOpen } from 'lucide-react'
import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'
import { LeagueDramaWidget } from '@/components/app/league/LeagueDramaWidget'
import { ShareLeagueLinkCard } from '@/components/social/ShareLeagueLinkCard'
import { LeagueStoryModal } from '@/components/league-story'
import { GuillotineHome } from '@/components/guillotine/GuillotineHome'
import { SalaryCapHome } from '@/components/salary-cap/SalaryCapHome'
import { SurvivorHome } from '@/components/survivor/SurvivorHome'
import { ZombieHome } from '@/components/zombie/ZombieHome'
import { DevyHome } from '@/components/devy/DevyHome'
import { MergedDevyC2CHome } from '@/components/merged-devy-c2c/MergedDevyC2CHome'

export default function OverviewTab({ leagueId, isGuillotine, isSalaryCap, isSurvivor, isZombie, isDevyDynasty, isMergedDevyC2C, isCommissioner }: LeagueTabProps & { isGuillotine?: boolean; isSalaryCap?: boolean; isSurvivor?: boolean; isZombie?: boolean; isDevyDynasty?: boolean; isMergedDevyC2C?: boolean; isCommissioner?: boolean }) {
  const [storyModalOpen, setStoryModalOpen] = useState(false)
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'overview')
  const roster = Array.isArray(data?.roster) ? data?.roster : []
  const faab = typeof data?.faabRemaining === 'number' ? data.faabRemaining : '-'
  const sport = (data as { sport?: string })?.sport
  const season = (data as { season?: number })?.season
  const leagueName = (data as { leagueName?: string })?.leagueName ?? 'League'

  if (isGuillotine) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <GuillotineHome leagueId={leagueId} />
      </TabDataState>
    )
  }

  if (isSalaryCap) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <SalaryCapHome leagueId={leagueId} />
      </TabDataState>
    )
  }

  if (isSurvivor) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <SurvivorHome leagueId={leagueId} />
      </TabDataState>
    )
  }

  if (isZombie) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <ZombieHome leagueId={leagueId} />
      </TabDataState>
    )
  }

  if (isDevyDynasty) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <DevyHome leagueId={leagueId} isCommissioner={isCommissioner} />
      </TabDataState>
    )
  }

  if (isMergedDevyC2C) {
    return (
      <TabDataState title="Overview" loading={false} error={null} onReload={() => {}}>
        <MergedDevyC2CHome leagueId={leagueId} isCommissioner={isCommissioner} />
      </TabDataState>
    )
  }

  return (
    <TabDataState title="Overview" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <ShareLeagueLinkCard leagueId={leagueId} />
        <button
          type="button"
          onClick={() => setStoryModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/30 px-4 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-950/50 w-full sm:w-auto"
        >
          <BookOpen className="h-4 w-4" /> Create league story
        </button>
        {storyModalOpen && (
          <LeagueStoryModal
            leagueId={leagueId}
            leagueName={leagueName}
            week={typeof season === 'number' ? undefined : undefined}
            season={typeof season === 'number' ? String(season) : undefined}
            sport={sport}
            onClose={() => setStoryModalOpen(false)}
          />
        )}
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
