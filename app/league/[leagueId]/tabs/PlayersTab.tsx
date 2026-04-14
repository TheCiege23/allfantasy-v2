'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { PlayerImage } from '@/app/components/PlayerImage'
import { TeamLogo } from '@/app/components/TeamLogo'
import type { SlimPlayer } from '@/lib/hooks/useSleeperPlayers'
import { useSleeperPlayers } from '@/lib/hooks/useSleeperPlayers'
import { ProjectionDisplay } from '@/components/weather/ProjectionDisplay'
import { placeholderBaselineProjection } from '@/components/weather/placeholderBaseline'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import {
  fmtStat,
  type RollingInsightsTableStats,
} from '@/lib/players/rolling-insights-stats-display'
import { StartVsComparisonLauncher } from '@/components/app/player-comparison/StartVsComparisonLauncher'

type RiBatchEntry = {
  season: string | null
  fantasyPointsPerGame: number | null
  fantasyPointsSeason: number | null
  gamesPlayed: number | null
  injuryStatus: string | null
  stats: RollingInsightsTableStats | null
  source: 'rolling_insights'
}

export type PlayersTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
  sport?: string
}

type PosFilter = string

const NFL_FILTERS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF', 'MORE']

const NBA_FILTERS: PosFilter[] = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C', 'MORE']

const GENERIC_FILTERS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'MORE']

function watchlistStorageKey(leagueId: string): string {
  return `af-league-players-watchlist-${leagueId}`
}

function readWatchlist(leagueId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(watchlistStorageKey(leagueId))
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.map((x) => String(x)))
  } catch {
    return new Set()
  }
}

function badgePosition(p: SlimPlayer): string {
  if (p.position === 'DST') return 'DEF'
  return p.position
}

function injuryNeedsAttention(status: string | null | undefined): boolean {
  if (status == null || !String(status).trim()) return false
  const u = status.trim().toLowerCase()
  return u !== 'active' && u !== 'healthy'
}

function matchesPosition(sportU: string, p: SlimPlayer, pos: PosFilter): boolean {
  if (pos === 'ALL') return true
  const up = (p.position || '').toUpperCase()
  if (pos === 'DEF') return up === 'DEF' || up === 'DST'
  if (pos === 'DL') return ['DL', 'DE', 'DT', 'NT'].includes(up)
  if (pos === 'DB') return ['DB', 'CB', 'S', 'SS', 'FS', 'NB'].includes(up)
  if (pos === 'LB') return up === 'LB'
  if (pos === 'MORE') {
    const known = new Set(
      sportU === 'NBA'
        ? ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']
        : sportU === 'NFL' || sportU === 'NCAAF'
          ? ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'DL', 'DE', 'DT', 'LB', 'DB', 'CB', 'S', 'OL', 'T', 'G', 'C']
          : ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST'],
    )
    return !known.has(up)
  }
  return up === pos
}

type FaRow = { id: string; name: string; position: string | null; team: string | null }

export function PlayersTab({ league, onPlayerClick, sport }: PlayersTabProps) {
  const resolvedSport = normalizeToSupportedSport(sport ?? league.sport) ?? 'NFL'
  const sportU = resolvedSport.toUpperCase()
  const { players, loading } = useSleeperPlayers(resolvedSport)
  const seasonYear = new Date().getFullYear()
  const [weekNum, setWeekNum] = useState(1)
  const [seasonSel, setSeasonSel] = useState(seasonYear)
  const [pos, setPos] = useState<PosFilter>('ALL')
  const [projection, setProjection] = useState(true)
  const [freeAgents, setFreeAgents] = useState(false)
  const [watchlist, setWatchlist] = useState(false)
  const [rookies, setRookies] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  const [teamQuery, setTeamQuery] = useState('')
  const [faRows, setFaRows] = useState<FaRow[] | null>(null)
  const [faLoading, setFaLoading] = useState(false)
  const [wlIds, setWlIds] = useState<Set<string>>(() => readWatchlist(league.id))
  const [riBySleeper, setRiBySleeper] = useState<Record<string, RiBatchEntry>>({})

  const positionRow = useMemo(() => {
    if (sportU === 'NBA') return NBA_FILTERS
    if (sportU === 'NFL' || sportU === 'NCAAF') return NFL_FILTERS
    return GENERIC_FILTERS
  }, [sportU])

  useEffect(() => {
    setWlIds(readWatchlist(league.id))
  }, [league.id])

  const persistWatchlist = useCallback(
    (next: Set<string>) => {
      setWlIds(next)
      try {
        window.localStorage.setItem(watchlistStorageKey(league.id), JSON.stringify([...next]))
      } catch {
        /* ignore */
      }
    },
    [league.id],
  )

  const toggleWatchPlayer = useCallback(
    (playerId: string) => {
      const next = new Set(wlIds)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      persistWatchlist(next)
    },
    [wlIds, persistWatchlist],
  )

  useEffect(() => {
    if (!freeAgents) {
      setFaRows(null)
      return
    }
    let cancelled = false
    setFaLoading(true)
    const t = window.setTimeout(() => {
      const q = [playerQuery, teamQuery].filter(Boolean).join(' ').trim().toLowerCase()
      const posQ =
        pos === 'ALL' || pos === 'MORE'
          ? ''
          : pos === 'DEF'
            ? 'DEF'
            : pos
      const url = `/api/waiver-wire/leagues/${encodeURIComponent(league.id)}/players?limit=100${posQ ? `&position=${encodeURIComponent(posQ)}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
      fetch(url, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { players?: FaRow[] } | null) => {
          if (cancelled || !d?.players) return
          setFaRows(d.players)
        })
        .catch(() => {
          if (!cancelled) setFaRows([])
        })
        .finally(() => {
          if (!cancelled) setFaLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [freeAgents, league.id, pos, playerQuery, teamQuery])

  const poolList = useMemo((): SlimPlayer[] => {
    if (freeAgents && faRows) {
      return faRows.map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position ?? '—',
        team: r.team?.trim() || 'FA',
      }))
    }
    return Object.values(players)
  }, [freeAgents, faRows, players])

  const filtered = useMemo(() => {
    let rows = poolList.filter((p) => p.position)
    rows = rows.filter((p) => matchesPosition(sportU, p, pos))
    const pq = playerQuery.trim().toLowerCase()
    const tq = teamQuery.trim().toLowerCase()
    if (pq) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(pq) ||
          p.id.toLowerCase().includes(pq) ||
          p.name.split(/\s+/).some((part) => part.toLowerCase().startsWith(pq)),
      )
    }
    if (tq) {
      rows = rows.filter((p) => (p.team || '').toLowerCase().includes(tq))
    }
    if (rookies) {
      rows = rows.filter((p) => p.years_exp === 0)
    }
    if (watchlist) {
      rows = rows.filter((p) => wlIds.has(p.id))
    }
    rows.sort((a, b) => {
      const pa = riBySleeper[a.id]?.fantasyPointsPerGame ?? placeholderBaselineProjection(a.id)
      const pb = riBySleeper[b.id]?.fantasyPointsPerGame ?? placeholderBaselineProjection(b.id)
      return pb - pa
    })
    return rows.slice(0, 100)
  }, [poolList, pos, playerQuery, teamQuery, rookies, watchlist, wlIds, sportU, riBySleeper])

  const filteredIdsKey = useMemo(
    () => [...filtered.map((p) => p.id)].sort().join(','),
    [filtered],
  )

  useEffect(() => {
    if (filtered.length === 0) {
      setRiBySleeper({})
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void fetch('/api/players/rolling-insights/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sport: sportU,
          sleeperIds: filtered.map((p) => p.id),
          season: String(seasonSel),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { bySleeperId?: Record<string, RiBatchEntry> } | null) => {
          if (cancelled || !d?.bySleeperId) return
          setRiBySleeper(d.bySleeperId)
        })
        .catch(() => {
          if (!cancelled) setRiBySleeper({})
        })
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [filteredIdsKey, seasonSel, sportU, filtered.length])

  const busy = loading || (freeAgents && faLoading)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 space-y-3 border-b border-white/[0.07] bg-[#07071a] px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              type="search"
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              placeholder="Find player"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c1e] py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/35"
              data-testid="players-tab-search-name"
            />
          </div>
          <div className="relative min-w-[120px] flex-1">
            <input
              type="search"
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
              placeholder="Team (abbr)"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c1e] py-2 px-3 text-xs text-white placeholder:text-white/35"
              data-testid="players-tab-search-team"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {positionRow.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPos(p)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                pos === p
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}
              data-testid={`players-tab-pos-${p}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={() => setProjection(true)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                projection ? 'bg-white/15 text-white' : 'text-white/45'
              }`}
            >
              Projection
            </button>
            <button
              type="button"
              onClick={() => setProjection(false)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                !projection ? 'bg-white/15 text-white' : 'text-white/45'
              }`}
            >
              Stats
            </button>
          </div>
          <label className="text-[11px] text-white/45">
            <span className="sr-only">Season</span>
            <select
              value={seasonSel}
              onChange={(e) => setSeasonSel(Number(e.target.value))}
              className="rounded-lg border border-white/[0.08] bg-[#0c0c1e] px-2 py-1 text-[11px] text-white"
            >
              {[seasonYear - 1, seasonYear, seasonYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-white/45">
            <span className="sr-only">Week</span>
            <select
              value={weekNum}
              onChange={(e) => setWeekNum(Number(e.target.value))}
              className="rounded-lg border border-white/[0.08] bg-[#0c0c1e] px-2 py-1 text-[11px] text-white"
            >
              {Array.from({ length: sportU === 'NFL' || sportU === 'NCAAF' ? 18 : 24 }, (_, i) => i + 1).map(
                (w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ),
              )}
            </select>
          </label>

          {(
            [
              ['freeAgents', freeAgents, () => setFreeAgents((v) => !v), 'Free agents'],
              ['watchlist', watchlist, () => setWatchlist((v) => !v), 'Watchlist'],
              ['rookies', rookies, () => setRookies((v) => !v), 'Rookies'],
            ] as const
          ).map(([key, on, toggle, label]) => (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                on
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-transparent text-white/45 hover:border-white/20'
              }`}
              data-testid={`players-tab-toggle-${key}`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                  on ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/25'
                }`}
              >
                {on ? '✓' : ''}
              </span>
              {label}
            </button>
          ))}

          <button
            type="button"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/50"
            aria-label="Advanced filters"
            data-testid="players-tab-advanced-filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-white/35">
          Showing top <span className="text-white/55">100</span> by projected points for this filter.{' '}
          {freeAgents ? 'Free agents are not on any roster in this league (when available).' : null}{' '}
          Stats, injury, and season fantasy totals sync from{' '}
          <span className="text-white/45">Rolling Insights</span> when the player is mapped.
        </p>

        <div className="rounded-xl border border-white/[0.08] bg-[#0a1228]/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/45">Start A vs B</p>
          <StartVsComparisonLauncher
            leagueId={league.id}
            sport={resolvedSport}
            weekOrPeriod={`Week ${weekNum}`}
            showNameInputs
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-5 pb-6">
        <div className="min-w-[960px]">
          <div className="sticky top-0 z-[1] border-b border-white/[0.07] bg-[#07071a]">
            <div className="flex py-1 text-[9px] font-semibold uppercase tracking-wide text-white/35">
              <div className="w-8 shrink-0" />
              <div className="w-[200px] shrink-0">Player</div>
              <div className="w-14 shrink-0 text-right text-cyan-300/90">PTS</div>
              <div className="w-[120px] shrink-0 text-center">Rushing</div>
              <div className="w-[160px] shrink-0 text-center">Receiving</div>
              <div className="min-w-0 flex-1 text-center">Passing</div>
            </div>
            <div className="flex border-t border-white/[0.04] py-1.5 text-[8px] font-semibold uppercase tracking-wide text-white/25">
              <div className="w-8 shrink-0" />
              <div className="w-[200px] shrink-0" />
              <div className="w-14 shrink-0 text-right">Fantasy</div>
              <div className="flex w-[120px] shrink-0 justify-end gap-2 pr-1">
                <span className="w-6 text-right">Att</span>
                <span className="w-7 text-right">Yd</span>
                <span className="w-6 text-right">TD</span>
              </div>
              <div className="flex w-[160px] shrink-0 justify-end gap-1.5 pr-1">
                <span className="w-6 text-right">Rec</span>
                <span className="w-6 text-right">Tar</span>
                <span className="w-7 text-right">Yd</span>
                <span className="w-6 text-right">TD</span>
              </div>
              <div className="flex min-w-0 flex-1 justify-end gap-1.5 pr-1">
                <span className="w-6 text-right">Cmp</span>
                <span className="w-6 text-right">Att</span>
                <span className="w-7 text-right">Yd</span>
                <span className="w-6 text-right">TD</span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {busy ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-2 py-2">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
                  <span className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
                  <div className="w-[200px] shrink-0 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-white/10" />
                    <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
                  </div>
                  <div className="w-14 shrink-0 text-right">
                    <div className="ml-auto h-3 w-6 rounded bg-white/[0.06]" />
                  </div>
                  <div className="w-[120px] shrink-0 text-right">
                    <div className="ml-auto h-2.5 w-16 rounded bg-white/[0.05]" />
                  </div>
                  <div className="w-[160px] shrink-0 text-right">
                    <div className="ml-auto h-2.5 w-20 rounded bg-white/[0.05]" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="ml-auto h-2.5 w-24 rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))
            ) : (
              filtered.map((p) => {
                const ri = riBySleeper[p.id]
                const baseline = placeholderBaselineProjection(p.id)
                const projPts = ri?.fantasyPointsPerGame ?? baseline
                const seasonFp =
                  ri?.fantasyPointsSeason ??
                  (ri?.fantasyPointsPerGame != null && ri?.gamesPlayed != null
                    ? ri.fantasyPointsPerGame * ri.gamesPlayed
                    : null)
                const inj = ri?.injuryStatus
                return (
                  <div
                    key={p.id}
                    className="flex w-full items-center gap-1 py-2 text-left transition hover:bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleWatchPlayer(p.id)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] transition ${
                        wlIds.has(p.id)
                          ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200'
                          : 'border-white/20 text-white/60 hover:border-cyan-500/40'
                      }`}
                      aria-label={wlIds.has(p.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                      title="Watchlist"
                    >
                      {wlIds.has(p.id) ? '★' : '+'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlayerClick(p.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      data-testid={`players-tab-row-${p.id}`}
                    >
                      <PlayerImage
                        sleeperId={p.id}
                        sport={resolvedSport}
                        name={p.name}
                        position={p.position}
                        espnId={players[p.id]?.espn_id}
                        nbaId={players[p.id]?.nba_id}
                        size={28}
                        variant="round"
                      />
                      <div className="w-[200px] shrink-0">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <span className="min-w-0 truncate">{p.name}</span>
                          {injuryNeedsAttention(inj) ? (
                            <span
                              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-500/90 ring-1 ring-amber-400/30"
                              title={inj ?? 'Injury'}
                              aria-label={`Injury status: ${inj ?? 'unknown'}`}
                            />
                          ) : null}
                        </p>
                        <p className="flex flex-wrap items-center gap-1 text-[10px] text-white/40">
                          <span className="rounded border border-white/15 bg-white/5 px-1 text-[9px] font-semibold text-white/60">
                            {badgePosition(p)}
                          </span>
                          {p.team && p.team !== 'FA' ? (
                            <>
                              <TeamLogo teamAbbr={p.team} sport={resolvedSport} size={16} />
                              <span className="text-white/45">{p.team}</span>
                            </>
                          ) : (
                            <span className="text-white/45">FA</span>
                          )}
                        </p>
                      </div>
                    </button>
                    <div className="w-14 shrink-0 text-right text-[11px] text-white/60">
                      {projection ? (
                        <ProjectionDisplay
                          projection={projPts}
                          suffix=""
                          pointsClassName="text-[11px] text-white/60"
                          afCrestProps={{
                            playerId: p.id,
                            playerName: p.name,
                            sport: resolvedSport,
                            position: p.position || '—',
                            week: weekNum,
                            season: seasonSel,
                            size: 'xs',
                          }}
                        />
                      ) : seasonFp != null && Number.isFinite(seasonFp) ? (
                        <span className="tabular-nums text-white/70">{seasonFp.toFixed(1)}</span>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </div>
                    <RushStatRow stats={ri?.stats ?? null} />
                    <RecStatRow stats={ri?.stats ?? null} />
                    <PassStatRow stats={ri?.stats ?? null} />
                  </div>
                )
              })
            )}
          </div>
          {!busy && filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">No players match filters.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const dash = 'text-[10px] text-white/40 tabular-nums'

function RushStatRow({ stats }: { stats: RollingInsightsTableStats | null }) {
  const s = stats
  return (
    <div className={`flex w-[120px] shrink-0 justify-end gap-2 pr-1 ${dash}`}>
      <span className="w-6 text-right">{fmtStat(s?.rushAtt)}</span>
      <span className="w-7 text-right">{fmtStat(s?.rushYd)}</span>
      <span className="w-6 text-right">{fmtStat(s?.rushTd)}</span>
    </div>
  )
}

function RecStatRow({ stats }: { stats: RollingInsightsTableStats | null }) {
  const s = stats
  return (
    <div className={`flex w-[160px] shrink-0 justify-end gap-1.5 pr-1 ${dash}`}>
      <span className="w-6 text-right">{fmtStat(s?.rec)}</span>
      <span className="w-6 text-right">{fmtStat(s?.tar)}</span>
      <span className="w-7 text-right">{fmtStat(s?.recYd)}</span>
      <span className="w-6 text-right">{fmtStat(s?.recTd)}</span>
    </div>
  )
}

function PassStatRow({ stats }: { stats: RollingInsightsTableStats | null }) {
  const s = stats
  return (
    <div className={`flex min-w-0 flex-1 justify-end gap-1.5 pr-1 ${dash}`}>
      <span className="w-6 text-right">{fmtStat(s?.passCmp)}</span>
      <span className="w-6 text-right">{fmtStat(s?.passAtt)}</span>
      <span className="w-7 text-right">{fmtStat(s?.passYd)}</span>
      <span className="w-6 text-right">{fmtStat(s?.passTd)}</span>
    </div>
  )
}
