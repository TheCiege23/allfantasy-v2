'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import LegacyAIPanel from '@/components/app/tabs/LegacyAIPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { TradeBuilder } from '@/components/app/trade/TradeBuilder'
import { TradeHistory } from '@/components/app/trade/TradeHistory'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

type TradesTabMode = 'builder' | 'history'
type TrendTimeframe = '24h' | '7d' | '30d'
type TradeTrendTarget = {
  playerId: string
  trendScore: number
  tradeInterest: number
  trendingDirection: string
}

export default function TradesTab({ leagueId }: LeagueTabProps) {
  const { loading, error, reload } =
    useLeagueSectionData<Record<string, unknown>>(leagueId, 'trades')
  const [mode, setMode] = useState<TradesTabMode>('builder')
  const [sport, setSport] = useState<string>(DEFAULT_SPORT)
  const [trendTimeframe, setTrendTimeframe] = useState<TrendTimeframe>('7d')
  const [tradeTargets, setTradeTargets] = useState<TradeTrendTarget[]>([])
  const [tradeTargetsLoading, setTradeTargetsLoading] = useState(false)
  const [tradeTargetsError, setTradeTargetsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadLeagueSport = async () => {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!active) return
        setSport(normalizeToSupportedSport(json?.sport))
      } catch {
        if (!active) return
        setSport(DEFAULT_SPORT)
      }
    }
    void loadLeagueSport()
    return () => {
      active = false
    }
  }, [leagueId])

  const loadTradeTargets = useCallback(async () => {
    setTradeTargetsLoading(true)
    setTradeTargetsError(null)
    try {
      const params = new URLSearchParams({
        list: 'trade_targets',
        sport,
        timeframe: trendTimeframe,
        limit: '6',
      })
      const res = await fetch(`/api/player-trend?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.error) {
        setTradeTargets([])
        setTradeTargetsError(json?.error ?? 'Failed to load trade trend indicators')
        return
      }
      setTradeTargets(Array.isArray(json?.data) ? json.data : [])
    } catch {
      setTradeTargets([])
      setTradeTargetsError('Failed to load trade trend indicators')
    } finally {
      setTradeTargetsLoading(false)
    }
  }, [sport, trendTimeframe])

  useEffect(() => {
    void loadTradeTargets()
  }, [loadTradeTargets])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TabDataState
        title="Trades"
        loading={loading}
        error={error}
        onReload={() => void reload()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('builder')}
              className={`rounded-full px-3 py-1.5 text-xs ${
                mode === 'builder'
                  ? 'bg-white text-black'
                  : 'border border-white/20 bg-black/40 text-white/75 hover:bg-white/10'
              }`}
            >
              Trade Center
            </button>
            <button
              type="button"
              onClick={() => setMode('history')}
              className={`rounded-full px-3 py-1.5 text-xs ${
                mode === 'history'
                  ? 'bg-white text-black'
                  : 'border border-white/20 bg-black/40 text-white/75 hover:bg-white/10'
              }`}
            >
              Trade History
            </button>
          </div>

          {mode === 'builder' ? (
            <TradeBuilder leagueId={leagueId} />
          ) : (
            <TradeHistory leagueId={leagueId} />
          )}
        </div>
      </TabDataState>
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-white/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Trade trend indicators</p>
            <div className="flex items-center gap-2">
              <select
                value={trendTimeframe}
                onChange={(e) => setTrendTimeframe(e.target.value as TrendTimeframe)}
                className="rounded border border-white/20 bg-black/40 px-2 py-1 text-[11px] text-white"
                aria-label="Trade trend timeframe"
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
              </select>
              <button
                type="button"
                onClick={() => void loadTradeTargets()}
                className="rounded border border-cyan-400/40 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-white/55">
            Highest trade-interest players in {sport}. Use this context before sending offers.
          </p>
          <div className="mt-2">
            {tradeTargetsError ? (
              <p className="text-[11px] text-red-300">{tradeTargetsError}</p>
            ) : tradeTargetsLoading ? (
              <p className="text-[11px] text-white/60">Loading trend indicators...</p>
            ) : tradeTargets.length === 0 ? (
              <p className="text-[11px] text-white/60">No trade trend targets yet.</p>
            ) : (
              <ul className="space-y-1.5 text-[11px] text-white/80">
                {tradeTargets.map((row) => (
                  <li key={`${row.playerId}-${row.trendScore}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{row.playerId}</span>
                    <span className="shrink-0 text-white/60">
                      demand {(row.tradeInterest * 100).toFixed(0)}% · {row.trendingDirection}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href={`/app/trend-feed?sport=${encodeURIComponent(sport)}&timeframe=${encodeURIComponent(trendTimeframe)}`}
            className="mt-2 inline-block text-[11px] text-violet-300 hover:underline"
          >
            Open full trend feed
          </Link>
        </section>
        <LegacyAIPanel
          leagueId={leagueId}
          endpoint="trade-command-center"
          title="Legacy Trade Command Center"
        />
      </div>
    </div>
  )
}

