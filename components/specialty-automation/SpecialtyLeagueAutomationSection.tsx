'use client'

import { useCallback, useEffect, useState } from 'react'
import SpecialtyPhaseStatusCard from '@/components/specialty-automation/SpecialtyPhaseStatusCard'
import LeagueSpecialtyEventFeed from '@/components/specialty-automation/LeagueSpecialtyEventFeed'
import CommissionerAutomationPanel from '@/components/specialty-automation/CommissionerAutomationPanel'
import SpecialtyAutomationBanner from '@/components/specialty-automation/SpecialtyAutomationBanner'

type FeedJson = {
  events: Array<{
    id: string
    eventType: string
    title: string
    description: string | null
    createdAt: string
  }>
  phase: {
    currentPhase: string | null
    currentStage: string | null
    currentWeekContext: number | null
    pendingActionCount: number
    updatedAt: string
  } | null
  recentRuns?: Array<{
    id: string
    concept: string
    triggerType: string
    status: string
    summary: string | null
    startedAt: string
    completedAt: string | null
  }>
}

export default function SpecialtyLeagueAutomationSection({
  leagueId,
  season,
  week,
  isCommissioner,
  conceptLabel = 'Specialty format',
}: {
  leagueId: string
  season: number
  week: number
  isCommissioner: boolean
  conceptLabel?: string
}) {
  const [data, setData] = useState<FeedJson | null>(null)
  const [loaded, setLoaded] = useState(false)

  const loadFeed = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/specialty-automation/feed`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setData({
        events: Array.isArray(json.events) ? json.events : [],
        phase: json.phase ?? null,
        recentRuns: Array.isArray(json.recentRuns) ? json.recentRuns : [],
      })
    }
  }, [leagueId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadFeed()
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId, loadFeed])

  if (!loaded) {
    return <div className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-[#131929]/80" aria-hidden />
  }

  const lastRun = data?.recentRuns?.[0] ?? null

  return (
    <section className="space-y-3" data-testid="specialty-automation-section" aria-label="Specialty league automation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8B9DB8]">Specialty automation</h3>
      </div>
      <SpecialtyAutomationBanner phase={data?.phase ?? null} recentRun={lastRun} conceptLabel={conceptLabel} />
      <div className="grid gap-3 lg:grid-cols-2">
        <SpecialtyPhaseStatusCard phase={data?.phase ?? null} conceptLabel={conceptLabel} />
        <div className="rounded-xl border border-[#1E2A42] bg-[#131929] px-3 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B9DB8]">Recent events</p>
          <LeagueSpecialtyEventFeed events={data?.events ?? []} />
        </div>
      </div>
      {isCommissioner ? (
        <CommissionerAutomationPanel
          leagueId={leagueId}
          defaultSeason={season}
          defaultWeek={week}
          onAfterRun={loadFeed}
        />
      ) : null}
    </section>
  )
}
