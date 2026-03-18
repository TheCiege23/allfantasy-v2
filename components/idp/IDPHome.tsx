'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Radio, BookOpen, Shield } from 'lucide-react'
import TabDataState from '@/components/app/tabs/TabDataState'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MetricCard, SmartDataView } from '@/components/app/league/SmartDataView'
import { LeagueDramaWidget } from '@/components/app/league/LeagueDramaWidget'
import { ShareLeagueLinkCard } from '@/components/social/ShareLeagueLinkCard'
import { LeagueStoryModal } from '@/components/league-story'
import { IdpScoringStyleCard } from '@/components/idp/IdpScoringStyleCard'

/**
 * IDP League overview. Offense + IDP combined; scoring style card, education, Chimmy.
 */
export default function IDPHome({ leagueId, onOpenChimmy }: { leagueId: string; onOpenChimmy?: () => void }) {
  const [storyModalOpen, setStoryModalOpen] = useState(false)
  const [idpConfig, setIdpConfig] = useState<{ scoringPreset: string; positionMode?: string; rosterPreset?: string } | null>(null)
  const [idpConfigLoading, setIdpConfigLoading] = useState(true)
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'overview')
  const roster = Array.isArray(data?.roster) ? data?.roster : []
  const faab = typeof data?.faabRemaining === 'number' ? data.faabRemaining : '-'
  const sport = (data as { sport?: string })?.sport
  const season = (data as { season?: number })?.season
  const leagueName = (data as { leagueName?: string })?.leagueName ?? 'League'

  useEffect(() => {
    let active = true
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/idp/config`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.config) setIdpConfig(d.config)
      })
      .finally(() => { if (active) setIdpConfigLoading(false) })
    return () => { active = false }
  }, [leagueId])

  return (
    <TabDataState title="Overview" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-200">
          <Shield className="h-4 w-4 shrink-0" />
          <span>IDP League — offense + individual defensive players. Set lineups in Roster; scoring includes defensive stats.</span>
        </div>
        <IdpScoringStyleCard
          leagueId={leagueId}
          config={idpConfig}
          loading={idpConfigLoading}
          onAskChimmy={onOpenChimmy}
        />
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
