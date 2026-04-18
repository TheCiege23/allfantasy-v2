'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Loader2, RefreshCw, Shield } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import type { WarRoomCommandCenterResult } from '@/lib/war-room-command-center/types'
import { isSupportedSport } from '@/lib/sport-scope'

function scrollToAiTools() {
  const el = document.querySelector('[data-testid="ai-tools-grid"]')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openWarRoomModal() {
  scrollToAiTools()
  window.dispatchEvent(new CustomEvent('af-open-ai-tool', { detail: { tool: 'warRoom' } }))
}

export function WarRoomMiniCard({ leagues }: { leagues: UserLeague[] }) {
  const [leagueId, setLeagueId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WarRoomCommandCenterResult | null>(null)

  useEffect(() => {
    const first = leagues[0]?.id ?? ''
    setLeagueId((prev) => (prev && leagues.some((l) => l.id === prev) ? prev : first))
  }, [leagues])

  const activeLeague = useMemo(() => leagues.find((l) => l.id === leagueId) ?? null, [leagues, leagueId])

  const load = useCallback(async () => {
    if (!leagueId) {
      setData(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const sportFilter =
        activeLeague && isSupportedSport(activeLeague.sport) ? String(activeLeague.sport).toUpperCase() : 'ALL'
      const res = await fetch('/api/ai-tools/war-room/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId,
          teamContext: 'my_team',
          strategyMode: 'balanced',
          timeHorizon: 'this_week',
          specificTeamExternalId: null,
          opponentTeamExternalId: null,
          skipAi: true,
          toggles: {
            includeNews: true,
            includeInjuries: true,
            includeWaiverSuggestions: true,
            includeTradeSuggestions: false,
            includeStartSitRecommendations: true,
            includePowerRankings: true,
            includeTrendingPlayers: true,
            includeRookieProspectIntel: false,
            includePlayoffImpact: true,
            includeDynastyWeighting: true,
          },
        }),
      })
      const json = (await res.json()) as WarRoomCommandCenterResult | { ok: false; error?: string }
      if (!res.ok || !json.ok) {
        setData(null)
        setError((json as { error?: string }).error || 'Could not load War Room')
        return
      }
      setData(json)
    } catch {
      setData(null)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [leagueId, activeLeague])

  useEffect(() => {
    void load()
  }, [load])

  if (leagues.length === 0) {
    return (
      <div
        className="rounded-2xl border border-white/[0.08] bg-[#0a0f18] p-4"
        data-testid="war-room-mini-empty"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
            <Shield className="h-4 w-4 text-rose-300" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#e8eaf6]">AF War Room</p>
            <p className="text-[11px] text-[#5c6480]">Season strategy command center</p>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#8b93ab]">Join a league to unlock the live command center.</p>
      </div>
    )
  }

  const nActions = data?.actions?.length ?? 0
  const pri = data?.scores?.commandPriority ?? null

  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a0f18] to-[#070b12] p-4"
      data-testid="war-room-mini-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
            <Shield className="h-4 w-4 text-rose-300" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none text-[#e8eaf6]">AF War Room</p>
            <p className="mt-1 text-[11px] leading-none text-[#5c6480]">Season strategy command center</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e3347] bg-[#121725] text-[#9ba3bf] transition hover:border-rose-500/35 hover:text-white disabled:opacity-50"
          aria-label="Refresh War Room"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {leagues.length > 1 ? (
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
          League
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[12px] text-[#e8eaf6]"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.sport})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-3 min-h-[52px]">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-[12px] text-[#5c6480]">
            <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
            Orchestrating modules…
          </div>
        ) : error ? (
          <p className="text-[12px] text-amber-200/90">{error}</p>
        ) : data?.ok ? (
          <>
            <p className="text-[11px] text-[#7a8199]">
              <span className="text-white/80">{data.leagueName || 'League'}</span>
              {data.overview.degraded ? (
                <span className="ml-1.5 rounded border border-amber-500/30 px-1 text-[9px] font-bold uppercase text-amber-200/90">
                  Partial
                </span>
              ) : (
                <span className="ml-1.5 rounded border border-emerald-500/25 px-1 text-[9px] font-bold uppercase text-emerald-200/85">
                  Live
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300/80">Action queue</p>
                <p className="text-[26px] font-black tabular-nums leading-none text-white/95">{nActions}</p>
                <p className="mt-0.5 text-[11px] text-white/55">prioritized moves</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-[#5c6480]">Command priority</p>
                <p className="text-[20px] font-bold tabular-nums text-cyan-200/90">{pri != null ? pri : '—'}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-[#5c6480]">Updated {new Date(data.computedAt).toLocaleString()}</p>
          </>
        ) : (
          <p className="text-[12px] text-[#8b93ab]">Select a league to load War Room.</p>
        )}
      </div>

      <button
        type="button"
        onClick={openWarRoomModal}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] py-2.5 text-[12px] font-semibold text-rose-100 transition hover:border-rose-400/45 hover:bg-rose-500/[0.12]"
        data-testid="war-room-mini-open-full"
      >
        Open War Room
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
