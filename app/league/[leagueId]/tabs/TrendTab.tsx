'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Minus, Plus } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { PlayerImage } from '@/app/components/PlayerImage'
import { TeamLogo } from '@/app/components/TeamLogo'
import {
  normalizeTrendPosition,
  type PlayerMap,
  resolvePlayerName,
  useSleeperPlayers,
} from '@/lib/hooks/useSleeperPlayers'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { FantasyCalcPlayer } from '@/lib/fantasycalc'

export type TrendTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
  sport?: string
}

type TrendPill = string

const NFL_FC_PILLS: TrendPill[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF']

const SLEEPER_PILLS: TrendPill[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

type TrendEntry = { player_id?: string; count?: number }

type TrendBoardPayload = {
  totalTeams: number
  playerRosterPct: Record<string, number>
  playerOwner: Record<string, { displayName: string }>
  myPlayerIds: string[]
  error?: string
}

type RowModel = {
  sleeperId: string
  delta: number
  mode: 'fc_value' | 'sleeper_activity'
}

function sleeperSportParam(sport: string): string {
  const u = sport.toUpperCase()
  if (u === 'NBA') return 'nba'
  return 'nfl'
}

function fcSettingsFromLeague(league: UserLeague): {
  isDynasty: boolean
  numTeams: number
  ppr: 0 | 0.5 | 1
  numQbs: 1 | 2
} {
  const settings =
    league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? (league.settings as Record<string, unknown>)
      : {}
  const numTeams = Math.min(32, Math.max(4, league.teamCount ?? 12))
  const isDynasty = league.isDynasty === true
  let ppr: 0 | 0.5 | 1 = 1
  const scoring = String(league.scoring ?? '').toLowerCase()
  if (scoring.includes('half')) ppr = 0.5
  if (scoring.includes('standard') && !scoring.includes('half')) ppr = 0
  const rosterPos = settings.roster_positions
  const posStr = Array.isArray(rosterPos) ? rosterPos.join(',') : String(rosterPos ?? '')
  const numQbs: 1 | 2 =
    settings.superflex === true ||
    settings.superflex === 'true' ||
    posStr.includes('SUPER_FLEX') ||
    posStr.includes('SUPERFLEX')
      ? 2
      : 1
  return { isDynasty, numTeams, ppr, numQbs }
}

function badgePosition(pos: string): string {
  if (pos === 'DST') return 'DEF'
  return pos
}

function matchesPill(sportU: string, pos: string, pill: string): boolean {
  if (pill === 'ALL') return true
  const up = pos.toUpperCase()
  if (pill === 'DEF') return up === 'DEF' || up === 'DST'
  if (pill === 'DL') return ['DL', 'DE', 'DT', 'NT'].includes(up)
  if (pill === 'DB') return ['DB', 'CB', 'S', 'SS', 'FS', 'NB'].includes(up)
  if (pill === 'LB') return up === 'LB'
  return normalizeTrendPosition(pos) === pill
}

function TrendRowAction({
  kind,
  onActivate,
}: {
  kind: 'add' | 'trade' | 'drop'
  onActivate: () => void
}) {
  const wrap =
    kind === 'add'
      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
      : kind === 'drop'
        ? 'border-rose-500/45 bg-rose-500/15 text-rose-300'
        : 'border-sky-500/45 bg-sky-500/15 text-sky-200'
  const Icon = kind === 'add' ? Plus : kind === 'drop' ? Minus : ArrowLeftRight
  const label = kind === 'add' ? 'Free agent — add' : kind === 'drop' ? 'On your roster' : 'Rostered — trade'
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${wrap} transition hover:brightness-110`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </button>
  )
}

export function TrendTab({ league, onPlayerClick, sport }: TrendTabProps) {
  const resolvedSport = normalizeToSupportedSport(sport ?? league.sport) ?? 'NFL'
  const sportU = resolvedSport.toUpperCase()
  const { players, loading: playersLoading } = useSleeperPlayers(resolvedSport)
  const sportParam = useMemo(() => sleeperSportParam(resolvedSport), [resolvedSport])
  const useFcNfl = sportU === 'NFL'

  const fcQs = useMemo(() => fcSettingsFromLeague(league), [league])

  const [up, setUp] = useState<RowModel[]>([])
  const [down, setDown] = useState<RowModel[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filterUp, setFilterUp] = useState<TrendPill>('ALL')
  const [filterDown, setFilterDown] = useState<TrendPill>('ALL')
  const [board, setBoard] = useState<TrendBoardPayload | null>(null)

  const pills = sportU === 'NFL' ? NFL_FC_PILLS : SLEEPER_PILLS

  const loadBoard = useCallback(async () => {
    try {
      const r = await fetch(`/api/league/trend-board?leagueId=${encodeURIComponent(league.id)}`, {
        credentials: 'include',
      })
      const d = (await r.json().catch(() => null)) as TrendBoardPayload | null
      if (r.ok && d && typeof d.playerRosterPct === 'object') {
        setBoard({
          totalTeams: d.totalTeams ?? 0,
          playerRosterPct: d.playerRosterPct ?? {},
          playerOwner: d.playerOwner ?? {},
          myPlayerIds: Array.isArray(d.myPlayerIds) ? d.myPlayerIds : [],
        })
      } else {
        setBoard({
          totalTeams: 0,
          playerRosterPct: {},
          playerOwner: {},
          myPlayerIds: [],
          error: typeof (d as { error?: string } | null)?.error === 'string' ? (d as { error: string }).error : undefined,
        })
      }
    } catch {
      setBoard({ totalTeams: 0, playerRosterPct: {}, playerOwner: {}, myPlayerIds: [] })
    }
  }, [league.id])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    await loadBoard()

    if (useFcNfl) {
      const buildFcUrl = (direction: 'up' | 'down') => {
        const p = new URLSearchParams({
          action: 'trending',
          direction,
          limit: '30',
          isDynasty: String(fcQs.isDynasty),
          numTeams: String(fcQs.numTeams),
          ppr: String(fcQs.ppr),
          numQbs: String(fcQs.numQbs),
        })
        return `/api/fantasycalc?${p.toString()}`
      }
      try {
        const [a, b] = await Promise.all([
          fetch(buildFcUrl('up'), { cache: 'no-store' }),
          fetch(buildFcUrl('down'), { cache: 'no-store' }),
        ])
        if (!a.ok || !b.ok) {
          throw new Error('fc')
        }
        const aj = (await a.json()) as { players?: FantasyCalcPlayer[] }
        const bj = (await b.json()) as { players?: FantasyCalcPlayer[] }
        const mapFc = (list: FantasyCalcPlayer[] | undefined, dir: 'up' | 'down'): RowModel[] => {
          const rows: RowModel[] = []
          for (const p of list ?? []) {
            const sid = String(p.player?.sleeperId ?? '').trim()
            if (!sid) continue
            const t = p.trend30Day
            if (dir === 'up' && t <= 0) continue
            if (dir === 'down' && t >= 0) continue
            rows.push({ sleeperId: sid, delta: t, mode: 'fc_value' })
          }
          return rows
        }
        setUp(mapFc(aj.players, 'up'))
        setDown(mapFc(bj.players, 'down'))
      } catch {
        try {
          const [a, b] = await Promise.all([
            fetch(`/api/league/trend?type=add&sport=${sportParam}`, { cache: 'no-store' }),
            fetch(`/api/league/trend?type=drop&sport=${sportParam}`, { cache: 'no-store' }),
          ])
          if (!a.ok || !b.ok) {
            setErr('Could not load trending players.')
            setUp([])
            setDown([])
            return
          }
          const addJson: unknown = await a.json()
          const dropJson: unknown = await b.json()
          const mapSleeper = (arr: unknown): RowModel[] =>
            (Array.isArray(arr) ? arr : [])
              .map((e) => e as TrendEntry)
              .filter((e) => e.player_id)
              .map((e) => ({
                sleeperId: String(e.player_id),
                delta: typeof e.count === 'number' ? e.count : 0,
                mode: 'sleeper_activity' as const,
              }))
          setUp(mapSleeper(addJson))
          setDown(mapSleeper(dropJson))
        } catch {
          setErr('Could not load trending players.')
          setUp([])
          setDown([])
        }
      }
    } else {
      try {
        const [a, b] = await Promise.all([
          fetch(`/api/league/trend?type=add&sport=${sportParam}`, { cache: 'no-store' }),
          fetch(`/api/league/trend?type=drop&sport=${sportParam}`, { cache: 'no-store' }),
        ])
        if (!a.ok || !b.ok) {
          setErr('Could not load trending players.')
          setUp([])
          setDown([])
          return
        }
        const addJson: unknown = await a.json()
        const dropJson: unknown = await b.json()
        const mapSleeper = (arr: unknown): RowModel[] =>
          (Array.isArray(arr) ? arr : [])
            .map((e) => e as TrendEntry)
            .filter((e) => e.player_id)
            .map((e) => ({
              sleeperId: String(e.player_id),
              delta: typeof e.count === 'number' ? e.count : 0,
              mode: 'sleeper_activity' as const,
            }))
        setUp(mapSleeper(addJson))
        setDown(mapSleeper(dropJson))
      } catch {
        setErr('Could not load trending players.')
        setUp([])
        setDown([])
      }
    }
    setLoading(false)
  }, [fcQs.isDynasty, fcQs.numQbs, fcQs.numTeams, fcQs.ppr, loadBoard, league.id, sportParam, useFcNfl])

  useEffect(() => {
    void load()
  }, [load])

  const mySet = useMemo(() => new Set(board?.myPlayerIds ?? []), [board])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:gap-4 md:p-5">
      <p className="text-[10px] leading-snug text-white/35">
        {useFcNfl ? (
          <>
            Value trend uses{' '}
            <span className="text-white/50">FantasyCalc</span> 30-day movement matched to your league size and scoring.
            Roster % and managers reflect this league when synced.
          </>
        ) : (
          <>
            Activity from <span className="text-white/50">Sleeper</span> adds/drops (24h). Tie-in with your league
            rosters when available.
          </>
        )}
      </p>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 md:gap-5">
        <TrendColumn
          title="Trending up"
          rows={up}
          sport={resolvedSport}
          sportU={sportU}
          loading={loading}
          error={err}
          filter={filterUp}
          pills={pills}
          onFilterChange={setFilterUp}
          onPlayerClick={onPlayerClick}
          direction="up"
          players={players}
          playersLoading={playersLoading}
          board={board}
          mySet={mySet}
        />
        <TrendColumn
          title="Trending down"
          rows={down}
          sport={resolvedSport}
          sportU={sportU}
          loading={loading}
          error={err}
          filter={filterDown}
          pills={pills}
          onFilterChange={setFilterDown}
          onPlayerClick={onPlayerClick}
          direction="down"
          players={players}
          playersLoading={playersLoading}
          board={board}
          mySet={mySet}
        />
      </div>
    </div>
  )
}

function TrendColumn({
  title,
  rows,
  sport,
  sportU,
  loading,
  error,
  filter,
  pills,
  onFilterChange,
  onPlayerClick,
  direction,
  players,
  playersLoading,
  board,
  mySet,
}: {
  title: string
  rows: RowModel[]
  sport: string
  sportU: string
  loading: boolean
  error: string | null
  filter: TrendPill
  pills: TrendPill[]
  onFilterChange: (p: TrendPill) => void
  onPlayerClick: (id: string) => void
  direction: 'up' | 'down'
  players: PlayerMap
  playersLoading: boolean
  board: TrendBoardPayload | null
  mySet: Set<string>
}) {
  const filteredRows = useMemo(() => {
    if (filter === 'ALL') return rows
    if (playersLoading) return rows
    return rows.filter((e) => {
      const r = resolvePlayerName(e.sleeperId, players)
      return matchesPill(sportU, r.position, filter)
    })
  }, [rows, filter, players, playersLoading, sportU])

  return (
    <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a1228]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 md:px-4">
        <h2 className="text-[13px] font-bold tracking-tight text-white">{title}</h2>
        <label className="relative">
          <span className="sr-only">Position filter</span>
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="appearance-none rounded-lg border border-white/[0.1] bg-[#07071a] py-1.5 pl-2.5 pr-8 text-[11px] font-semibold text-white/85 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          >
            {pills.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/35">
            ▾
          </span>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2 md:px-2">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-white/40">Loading…</p>
        ) : error ? (
          <p className="px-3 py-8 text-center text-sm text-amber-300/90">{error}</p>
        ) : filteredRows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-white/40">No trending data.</p>
        ) : (
          <ul className="space-y-0.5">
            {filteredRows.map((e, i) => {
              const id = e.sleeperId
              const resolved = resolvePlayerName(id, players)
              const displayName = playersLoading ? `Player ${id.slice(-4)}` : resolved.name
              const showTeam = resolved.team && resolved.team !== 'FA'
              const pct = board?.playerRosterPct[id]
              const owner = board?.playerOwner[id]?.displayName
              const rosteredLabel = pct != null && Number.isFinite(pct) ? `${Math.round(pct)}%` : '—%'

              let action: 'add' | 'trade' | 'drop' = 'add'
              if (mySet.has(id)) action = 'drop'
              else if (owner) action = 'trade'

              const posLine = playersLoading ? (
                '— · —'
              ) : (
                <span className="flex flex-wrap items-center gap-1">
                  <span>{badgePosition(resolved.position || '—')}</span>
                  <span className="text-white/25">·</span>
                  {showTeam ? (
                    <>
                      <TeamLogo teamAbbr={resolved.team} sport={sport} size={14} />
                      <span>{resolved.team}</span>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </span>
              )

              const deltaClass = direction === 'up' ? 'text-emerald-400' : 'text-rose-400'
              let deltaText: string
              if (e.mode === 'fc_value') {
                const n = e.delta
                deltaText = direction === 'up' ? `+${Math.abs(n).toLocaleString()}` : n.toLocaleString()
              } else {
                const n = e.delta
                deltaText =
                  direction === 'up' ? `+${Math.abs(n).toLocaleString()}` : `−${Math.abs(n).toLocaleString()}`
              }

              return (
                <li key={`${id}-${i}`}>
                  <div className="flex items-center gap-2 rounded-lg px-1.5 py-2 transition hover:bg-white/[0.04] md:gap-2.5 md:px-2">
                    <TrendRowAction kind={action} onActivate={() => onPlayerClick(id)} />
                    <span className="w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums text-white/50">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayerClick(id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      data-testid={`trend-tab-row-${id}`}
                    >
                      <PlayerImage
                        sleeperId={id}
                        sport={sport}
                        name={displayName}
                        position={resolved.position}
                        espnId={players[id]?.espn_id}
                        nbaId={players[id]?.nba_id}
                        size={40}
                        variant="round"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                        <div className="text-[11px] text-white/40">{posLine}</div>
                        {owner ? (
                          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-cyan-300/85">
                            <span className="text-cyan-400/90" aria-hidden>
                              →
                            </span>
                            <span className="truncate">{owner}</span>
                          </p>
                        ) : null}
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
                      <span className={`text-[15px] font-bold tabular-nums ${deltaClass}`}>{deltaText}</span>
                      <span className="text-[10px] text-white/38">
                        Rostered {rosteredLabel}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
