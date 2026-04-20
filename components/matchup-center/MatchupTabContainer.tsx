'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import type { MatchupCenterPayload } from '@/lib/matchup-center/types'
import { MatchupHeaderCard } from '@/components/matchup-center/MatchupHeaderCard'
import { MatchupStarterRow } from '@/components/matchup-center/MatchupStarterRow'
import { MatchupWeekSelector } from '@/components/matchup-center/MatchupWeekSelector'
import { MatchupInsightsPanel } from '@/components/matchup-center/MatchupInsightsPanel'
import { MatchupAiAnalysisPanel } from '@/components/matchup-center/MatchupAiAnalysisPanel'
import { MatchupStartSitModal } from '@/components/matchup-center/MatchupStartSitModal'
import { useInflightRequestDedupe } from '@/hooks/useInflightRequestDedupe'
import { useLeagueMatchupAi } from '@/hooks/useLeagueMatchupAi'
import type { MatchupPlayerSlot } from '@/lib/matchup-center/types'
import type { LeagueMatchupAiResult, StartSitAiResult } from '@/lib/ai-matchup-engine/types'

function maxWeekForSport(sportU: string): number {
  switch (sportU.toUpperCase()) {
    case 'NBA':
    case 'NHL':
      return 24
    case 'MLB':
      return 27
    case 'SOCCER':
      return 38
    case 'NCAAB':
      return 35
    default:
      return 18
  }
}

function zipStarters(left: MatchupCenterPayload['left'], right: MatchupCenterPayload['right']) {
  const n = Math.max(left.starters.length, right.starters.length)
  const rows: Array<{ pos: string; left: (typeof left.starters)[0] | null; right: (typeof right.starters)[0] | null }> = []
  for (let i = 0; i < n; i++) {
    const l = left.starters[i] ?? null
    const r = right.starters[i] ?? null
    const pos = l?.position ?? r?.position ?? '—'
    rows.push({ pos, left: l, right: r })
  }
  return rows
}

export function MatchupTabContainer({ league }: { league: UserLeague }) {
  const dedupe = useInflightRequestDedupe()
  const initialSeason = useMemo(() => {
    const parsed = Number(league.season)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : new Date().getFullYear()
  }, [league.season])
  const [season, setSeason] = useState<number>(initialSeason)
  const [week, setWeek] = useState(() => Math.max(1, league.currentWeek ?? 1))
  const [payload, setPayload] = useState<MatchupCenterPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { runMatchupAnalysis, runStartSit, matchupLoading, startSitLoading } = useLeagueMatchupAi(league.id)
  const [matchupAi, setMatchupAi] = useState<LeagueMatchupAiResult | null>(null)
  const [matchupAiErr, setMatchupAiErr] = useState<string | null>(null)
  const [ssOpen, setSsOpen] = useState(false)
  const [ssLeft, setSsLeft] = useState<MatchupPlayerSlot | null>(null)
  const [ssRight, setSsRight] = useState<MatchupPlayerSlot | null>(null)
  const [ssResult, setSsResult] = useState<StartSitAiResult | null>(null)
  const [ssErr, setSsErr] = useState<string | null>(null)

  const sportU = String(league.sport ?? 'NFL')
  const maxW = useMemo(() => maxWeekForSport(sportU), [sportU])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setError(null)
        setLoading(true)
      }
      try {
        const data = await dedupe(`matchup:${league.id}:${season}:${week}`, async () => {
          const res = await fetch(
            `/api/leagues/${encodeURIComponent(league.id)}/matchup-center?season=${season}&week=${week}`,
            { credentials: 'include' },
          )
          const json = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(json?.error ?? 'Failed to load matchup')
          return json.payload as MatchupCenterPayload
        })
        setPayload(data)
        if (opts?.silent) setError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error'
        if (!opts?.silent) {
          setError(msg)
          setPayload(null)
        }
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [dedupe, league.id, season, week],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setMatchupAi(null)
    setMatchupAiErr(null)
  }, [season, week])

  useEffect(() => {
    setSeason(initialSeason)
  }, [initialSeason])

  useEffect(() => {
    if (!payload) return
    const ms = payload.refreshIntervalMs
    if (!Number.isFinite(ms) || ms <= 0) return
    const id = window.setInterval(() => {
      void load({ silent: true })
    }, ms)
    return () => window.clearInterval(id)
  }, [payload?.refreshIntervalMs, payload?.matchupStatus, season, week, load])

  const rows = useMemo(() => (payload ? zipStarters(payload.left, payload.right) : []), [payload])

  const handleStartSit = (a: MatchupPlayerSlot, b: MatchupPlayerSlot) => {
    setSsLeft(a)
    setSsRight(b)
    setSsOpen(true)
    setSsResult(null)
    setSsErr(null)
    void (async () => {
      try {
        const r = await runStartSit({ sport: sportU, playerA: a, playerB: b })
        setSsResult(r)
      } catch (e) {
        setSsErr(e instanceof Error ? e.message : 'Start/sit failed')
      }
    })()
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <MatchupWeekSelector
          season={season}
          week={week}
          maxWeek={maxW}
          disabled={loading}
          onChange={(n) => {
            setSeason(n.season)
            setWeek(n.week)
          }}
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100/95 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !payload ? (
        <div className="flex justify-center py-16 text-cyan-300/90">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100/90">{error}</div>
      ) : null}

      {payload ? (
        <>
          <MatchupHeaderCard
            left={payload.left}
            right={payload.right}
            matchupStatus={payload.matchupStatus}
            winProbabilityLeft={payload.winProbabilityLeft}
            conceptOverlay={payload.conceptOverlay}
          />
          <MatchupAiAnalysisPanel
            sport={sportU}
            loading={matchupLoading}
            result={matchupAi}
            error={matchupAiErr}
            onRun={() => {
              setMatchupAiErr(null)
              void (async () => {
                try {
                  const r = await runMatchupAnalysis({ season, week })
                  setMatchupAi(r)
                } catch (e) {
                  setMatchupAi(null)
                  setMatchupAiErr(e instanceof Error ? e.message : 'AI failed')
                }
              })()
            }}
          />
          <div className="rounded-2xl border border-white/[0.08] bg-[#060b18]/80 px-2">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">
                No starter rows yet — set your lineup for week {payload.week}, or run weekly scoring.
              </p>
            ) : (
              rows.map((row, i) => (
                <MatchupStarterRow
                  key={`${row.pos}-${i}`}
                  position={row.pos}
                  left={row.left}
                  right={row.right}
                  onStartSit={handleStartSit}
                />
              ))
            )}
          </div>
          <MatchupInsightsPanel insights={payload.insights} partialData={payload.partialData} />
        </>
      ) : null}

      {ssLeft && ssRight ? (
        <MatchupStartSitModal
          open={ssOpen}
          onClose={() => {
            setSsOpen(false)
            setSsLeft(null)
            setSsRight(null)
            setSsResult(null)
            setSsErr(null)
          }}
          loading={startSitLoading}
          result={ssResult}
          error={ssErr}
          left={ssLeft}
          right={ssRight}
        />
      ) : null}
    </div>
  )
}
