'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Headphones, Heart, Search } from 'lucide-react'
import type { LeagueTeamSlot, UserLeague } from '@/app/dashboard/types'
import { PlayerImage } from '@/app/components/PlayerImage'
import { ActiveTradeCard } from '@/components/league/TradeCard'
import type { LeagueTradeHistoryItem } from '@/components/league/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { LeagueTradeBlockPanelItem } from '@/components/league/types'
import { ZombieTradePolicyCard } from '@/components/zombie/ZombieTradePolicyCard'

export type TradesTabProps = {
  league: UserLeague
  teams: LeagueTeamSlot[]
}

type PanelMode = 'review' | 'trade'

function watchStorageKey(leagueId: string): string {
  return `af-league-trade-block-watch-${leagueId}`
}

function readWatchSet(leagueId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(watchStorageKey(leagueId))
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.map((x) => String(x)))
  } catch {
    return new Set()
  }
}

function shortDisplayName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0) return full
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const rest = parts.slice(1).join(' ')
  if (first.length <= 1) return full
  return `${first[0]}. ${rest}`
}

function positionAccent(pos: string): { border: string; label: string } {
  const p = pos.toUpperCase()
  if (p === 'QB') return { border: 'border-pink-400/65', label: 'text-pink-300/90' }
  if (p === 'RB') return { border: 'border-emerald-400/65', label: 'text-emerald-300/90' }
  if (p === 'WR') return { border: 'border-sky-400/70', label: 'text-sky-300/90' }
  if (p === 'TE') return { border: 'border-orange-400/65', label: 'text-orange-300/90' }
  if (['DL', 'DE', 'DT', 'NT'].includes(p)) return { border: 'border-amber-500/65', label: 'text-amber-300/90' }
  if (p === 'LB') return { border: 'border-lime-400/55', label: 'text-lime-300/85' }
  if (['DB', 'CB', 'S', 'SS', 'FS'].includes(p)) return { border: 'border-indigo-400/65', label: 'text-indigo-300/90' }
  if (p === 'K') return { border: 'border-yellow-400/55', label: 'text-yellow-200/85' }
  if (p === 'DEF' || p === 'DST') return { border: 'border-slate-400/60', label: 'text-slate-300/90' }
  return { border: 'border-cyan-400/50', label: 'text-cyan-300/85' }
}

export function TradesTab({ league, teams }: TradesTabProps) {
  const sport = normalizeToSupportedSport(league.sport) ?? 'NFL'
  const [panelMode, setPanelMode] = useState<PanelMode>('trade')
  const [tradeBlock, setTradeBlock] = useState<LeagueTradeBlockPanelItem[]>([])
  const [activeTrades, setActiveTrades] = useState<LeagueTradeHistoryItem[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [watch, setWatch] = useState<Set<string>>(() => readWatchSet(league.id))

  const persistWatch = useCallback(
    (next: Set<string>) => {
      setWatch(next)
      try {
        window.localStorage.setItem(watchStorageKey(league.id), JSON.stringify([...next]))
      } catch {
        /* ignore */
      }
    },
    [league.id],
  )

  const toggleWatch = useCallback(
    (playerId: string) => {
      const next = new Set(watch)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      persistWatch(next)
    },
    [watch, persistWatch],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/league/trades-panel?leagueId=${encodeURIComponent(league.id)}`, {
        credentials: 'include',
      })
      const data = (await res.json().catch(() => null)) as {
        tradeBlock?: LeagueTradeBlockPanelItem[]
        activeTrades?: LeagueTradeHistoryItem[]
        activeCount?: number
        error?: string
      } | null
      if (!res.ok) {
        setErr(typeof data?.error === 'string' ? data.error : 'Could not load trades.')
        setTradeBlock([])
        setActiveTrades([])
        setActiveCount(0)
        return
      }
      setTradeBlock(Array.isArray(data?.tradeBlock) ? data.tradeBlock : [])
      setActiveTrades(Array.isArray(data?.activeTrades) ? (data.activeTrades as LeagueTradeHistoryItem[]) : [])
      setActiveCount(typeof data?.activeCount === 'number' ? data.activeCount : 0)
    } catch {
      setErr('Could not load trades.')
      setTradeBlock([])
      setActiveTrades([])
      setActiveCount(0)
    } finally {
      setLoading(false)
    }
  }, [league.id])

  useEffect(() => {
    void load()
  }, [load])

  const badgeCount = activeCount > 0 ? activeCount : activeTrades.length

  const tradeFinderHref = useMemo(() => '/trade-finder', [])

  const isZombie = String(league.leagueVariant ?? '').toLowerCase() === 'zombie'

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
      {isZombie ? <ZombieTradePolicyCard leagueId={league.id} /> : null}
      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a1228] md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Active Trades */}
        <section className="flex min-h-[280px] flex-col border-b border-white/[0.06] md:min-h-0 md:border-b-0 md:border-r md:border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold tracking-tight text-white">Active Trades</h2>
              <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[11px] font-bold text-cyan-300">
                {loading ? '—' : badgeCount}
              </span>
            </div>
          </div>

          <div className="flex gap-2 px-4 pt-3">
            <button
              type="button"
              onClick={() => setPanelMode('review')}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                panelMode === 'review'
                  ? 'bg-violet-300/25 text-[#1a1028] shadow-inner'
                  : 'border border-white/[0.08] bg-[#07071a] text-white/45 hover:border-white/15 hover:text-white/65'
              }`}
            >
              <Search className="h-3.5 w-3.5" strokeWidth={2.25} />
              Review
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('trade')}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                panelMode === 'trade'
                  ? 'bg-violet-300/25 text-[#1a1028] shadow-inner'
                  : 'border border-white/[0.08] bg-[#07071a] text-white/45 hover:border-white/15 hover:text-white/65'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              Trade
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-40 rounded bg-white/10" />
              </div>
            ) : err ? (
              <p className="py-10 text-center text-sm text-amber-300/90">{err}</p>
            ) : panelMode === 'review' ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                  <Search className="h-9 w-9 text-white/25" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-white/45">No trades awaiting your review.</p>
                <p className="mt-2 max-w-xs text-xs text-white/30">
                  When a partner sends a trade that needs your action, it will show here.
                </p>
              </div>
            ) : activeTrades.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent">
                  <Headphones className="h-12 w-12 text-white/22" strokeWidth={1.25} />
                </div>
                <p className="text-sm text-white/45">No active trades yet…</p>
                <Link
                  href={tradeFinderHref}
                  className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400 transition hover:text-cyan-300"
                  data-testid="trades-tab-propose-trade"
                >
                  Propose a trade
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {activeTrades.map((t) => (
                  <li key={t.id}>
                    <ActiveTradeCard trade={t} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Trade Block */}
        <section className="flex min-h-[240px] flex-col md:max-h-[min(560px,calc(100vh-200px))]">
          <div className="shrink-0 border-b border-white/[0.05] px-4 py-3">
            <h2 className="text-[13px] font-bold tracking-tight text-white">Trade Block</h2>
            <p className="mt-0.5 text-[10px] text-white/30">Players managers have flagged available</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2 md:px-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.05]" />
                ))}
              </div>
            ) : tradeBlock.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-white/45">No players on the trade block yet</p>
                <p className="mt-2 text-xs text-white/30">
                  {league.name} · {teams.length} teams
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {tradeBlock.map((item) => {
                  const accent = positionAccent(item.position)
                  const teamLine =
                    item.team && item.team.length
                      ? `${item.position} · ${item.team}`
                      : `${item.position} · —`
                  const watched = watch.has(item.playerId)
                  return (
                    <div
                      key={item.id}
                      className={`relative flex flex-col rounded-xl border-2 ${accent.border} bg-[#07071a]/90 p-2.5 shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-[10px] font-semibold leading-tight ${accent.label}`}>
                          {teamLine}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <PlayerImage
                            sleeperId={item.playerId}
                            sport={sport}
                            name={item.name}
                            position={item.position}
                            size={28}
                            variant="round"
                          />
                          <button
                            type="button"
                            onClick={() => toggleWatch(item.playerId)}
                            className={`rounded-full p-1 transition ${
                              watched ? 'text-rose-400' : 'text-white/30 hover:text-rose-400/80'
                            }`}
                            aria-label={watched ? 'Remove from watch' : 'Watch player'}
                          >
                            <Heart className={`h-3.5 w-3.5 ${watched ? 'fill-current' : ''}`} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[12px] font-bold leading-tight text-white">
                        {shortDisplayName(item.name)}
                      </p>
                      <p className="mt-auto truncate pt-2 text-[10px] text-cyan-200/45">{item.ownerName}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
