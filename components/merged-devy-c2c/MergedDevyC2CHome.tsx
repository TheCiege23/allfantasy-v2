'use client'

/**
 * Merged Devy / C2C (Campus to Canton) league Overview home. PROMPT 2/6.
 * Fetches summary from /api/leagues/[leagueId]/merged-devy-c2c/summary.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MergedDevyC2CCommissionerSettings } from './MergedDevyC2CCommissionerSettings'
import { C2CPromotionPanel } from './C2CPromotionPanel'
import { C2CCommissionerTools } from './C2CCommissionerTools'
import { C2CDraftCenter } from './C2CDraftCenter'
import { C2CBoard } from './C2CBoard'
import { Calendar, Trophy, GraduationCap, TrendingUp } from 'lucide-react'

interface C2CSummary {
  leagueId: string
  sport: string
  sportAdapterId: string | null
  config: {
    startupFormat: string
    mergedStartupDraft: boolean
    separateStartupCollegeDraft: boolean
    collegeRosterSize: number
    collegeActiveLineupSlots: Record<string, number>
    taxiSize: number
    rookieDraftRounds: number
    collegeDraftRounds: number
    bestBallPro: boolean
    bestBallCollege: boolean
    standingsModel: string
    mergedRookieCollegeDraft: boolean
    startupDraftType: string
    rookieDraftType: string
    collegeDraftType: string
  }
  draftPhase: string | null
  draftPhaseInfo: { phase: string; status: string; description: string } | null
  sessionId: string | null
}

interface MergedDevyC2CHomeProps {
  leagueId: string
  isCommissioner?: boolean
  rosterId?: string
}

export function MergedDevyC2CHome({ leagueId, isCommissioner }: MergedDevyC2CHomeProps) {
  const [summary, setSummary] = useState<C2CSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/summary`, { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Not a C2C league' : 'Failed to load')
          setLoading(false)
          return
        }
        const data = await res.json()
        setSummary(data)
      } catch {
        if (active) setError('Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchSummary()
    return () => { active = false }
  }, [leagueId])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/5 p-6">
        <span className="text-sm text-white/60">Loading C2C league…</span>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        {error ?? 'Summary not available'}
      </div>
    )
  }

  const { config, draftPhaseInfo, sport } = summary
  const adapterLabel = summary.sportAdapterId === 'nfl_c2c' ? 'NCAA Football' : summary.sportAdapterId === 'nba_c2c' ? 'NCAA Basketball' : 'College'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Merged Devy / Campus to Canton (C2C)</h2>
        <p className="mt-1 text-sm text-white/70">
          {sport} league with pro and {adapterLabel} college assets. Dynasty only; merged or separate startup, rookie and college drafts.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-white/5 p-2">
            <span className="text-white/50">College roster</span>
            <p className="font-medium text-white">{config.collegeRosterSize}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <span className="text-white/50">Taxi</span>
            <p className="font-medium text-white">{config.taxiSize}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <span className="text-white/50">Rookie rounds</span>
            <p className="font-medium text-white">{config.rookieDraftRounds}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <span className="text-white/50">College rounds</span>
            <p className="font-medium text-white">{config.collegeDraftRounds}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-white/50">
          Startup: {config.mergedStartupDraft ? 'Merged (pro + college)' : config.separateStartupCollegeDraft ? 'Separate pro then college' : 'Merged'}.
          {config.bestBallPro && ' Best ball enabled for pro.'}
          {config.bestBallCollege && ' Best ball enabled for college.'}
        </p>
        <p className="mt-1 text-xs text-white/50">
          College assets score only in college contests until promotion; pro assets score in pro contests.
        </p>
        <p className="mt-1 text-xs text-cyan-200/80">
          Best Ball auto-optimizes your highest scoring legal lineup for each enabled competition.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-amber-300">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">College Draft Countdown</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Next college draft date set in league settings.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Rookie Draft Countdown</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Next rookie draft after pro draft.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-emerald-300">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-medium">Promotion Window</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Promote college assets when eligible.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">College / Pro Power Rank</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Separate or hybrid per standings mode.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-white/90">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Future Class Strength</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Class depth by year; view in draft and board.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-white/90">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-medium">Upcoming Graduates</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Declared / drafted college assets in Promotion Center.</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <span className="text-xs font-medium text-white">College-to-Pro Pipeline Health</span>
        <p className="mt-1 text-xs text-white/50">Track rights-held college players and promotion eligibility. Commissioner audit timeline available in Promotion Center.</p>
      </div>

      {draftPhaseInfo && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-medium text-white">Draft</h3>
          <p className="mt-1 text-sm text-white/70">{draftPhaseInfo.description}</p>
          <p className="mt-1 text-xs text-white/50">Status: {draftPhaseInfo.status}</p>
          <Link
            href={`/app/league/${leagueId}?tab=Draft`}
            className="mt-3 inline-block rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Go to Draft
          </Link>
        </div>
      )}

      <C2CDraftCenter
        leagueId={leagueId}
        mergedStartupDraft={config.mergedStartupDraft}
        separateStartupCollegeDraft={config.separateStartupCollegeDraft}
        mergedRookieCollegeDraft={config.mergedRookieCollegeDraft}
      />

      <C2CBoard leagueId={leagueId} sport={sport} />

      <Link
        href={`/app/league/${leagueId}?tab=Roster`}
        className="block rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 hover:bg-white/10"
      >
        Pro &amp; college roster
      </Link>

      <C2CPromotionPanel leagueId={leagueId} isCommissioner={isCommissioner} />

      {config.standingsModel !== 'unified' && (
        <Link
          href={`/app/league/${leagueId}?tab=Standings%20%2F%20Playoffs`}
          className="block rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 hover:bg-white/10"
        >
          {config.standingsModel === 'hybrid' ? 'Hybrid standings' : 'College & pro standings'}
        </Link>
      )}

      {isCommissioner && <MergedDevyC2CCommissionerSettings leagueId={leagueId} />}

      {isCommissioner && <C2CCommissionerTools leagueId={leagueId} />}

      <Link
        href={`/app/league/${leagueId}?tab=Settings`}
        className="block rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 hover:bg-white/10"
      >
        League settings
      </Link>
    </div>
  )
}
