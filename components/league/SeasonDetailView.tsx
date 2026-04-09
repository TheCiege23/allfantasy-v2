'use client'

import { useEffect, useState } from 'react'
import { Trophy, Swords, Users, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react'
import { HistoricalDraftBoard } from './HistoricalDraftBoard'

interface TeamRecord {
  rosterId?: string
  ownerId?: string
  managerName?: string
  managerAvatar?: string
  wins?: number
  losses?: number
  ties?: number
  pointsFor?: number
  pointsAgainst?: number
  playoffFinish?: string
  isChampion?: boolean
  isRunnerUp?: boolean
}

interface MatchupFact {
  weekOrPeriod: number
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  winnerTeamId: string
}

interface SeasonData {
  season: {
    season: number
    teamRecords: TeamRecord[]
    teamCount: number
    scoringFormat: string | null
    championTeamId: string | null
    runnerUpName: string | null
  }
  matchups: MatchupFact[]
  standings: unknown[]
  draftPicks: unknown[]
  transactions: unknown[]
}

interface SeasonDetailViewProps {
  leagueId: string
  season: number
}

export function SeasonDetailView({ leagueId, season }: SeasonDetailViewProps) {
  const [data, setData] = useState<SeasonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDraft, setShowDraft] = useState(false)
  const [showMatchups, setShowMatchups] = useState(false)

  useEffect(() => {
    fetch(`/api/league/${leagueId}/season-history?season=${season}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leagueId, season])

  if (loading) return <div className="text-sm text-white/40 py-4">Loading {season} season...</div>
  if (!data?.season) return <div className="text-sm text-white/40">No data for {season}.</div>

  const records = (data.season.teamRecords ?? []) as TeamRecord[]
  const sorted = [...records].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.pointsFor ?? 0) - (a.pointsFor ?? 0))

  // Group matchups by week
  const weekMap = new Map<number, MatchupFact[]>()
  for (const m of data.matchups) {
    const week = m.weekOrPeriod
    if (!weekMap.has(week)) weekMap.set(week, [])
    weekMap.get(week)!.push(m)
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a - b)

  // Name lookup from records
  const nameMap = new Map<string, string>()
  for (const r of records) {
    const id = String(r.ownerId ?? r.rosterId)
    nameMap.set(id, r.managerName ?? id)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="text-lg font-bold text-white">{season} Season</div>
        <span className="text-xs text-white/40">{data.season.teamCount} teams · {data.season.scoringFormat ?? 'Standard'}</span>
      </div>

      {/* Standings */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70">
          <Users className="h-4 w-4" />Standings
        </h3>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/5 text-white/50">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Manager</th>
                <th className="px-3 py-2 text-center">W</th>
                <th className="px-3 py-2 text-center">L</th>
                <th className="px-3 py-2 text-center">T</th>
                <th className="px-3 py-2 text-right">PF</th>
                <th className="px-3 py-2 text-right">PA</th>
                <th className="px-3 py-2 text-center">Playoffs</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className={`border-t border-white/5 ${r.isChampion ? 'bg-amber-400/5' : ''}`}>
                  <td className="px-3 py-1.5 text-white/40">{i + 1}</td>
                  <td className="px-3 py-1.5 text-white/80 font-medium">
                    <div className="flex items-center gap-2">
                      {r.managerAvatar && <img src={r.managerAvatar} alt="" className="h-5 w-5 rounded-full" />}
                      {r.isChampion && <Trophy className="h-3 w-3 text-amber-400" />}
                      {r.managerName ?? 'Unknown'}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center text-emerald-400/80">{r.wins ?? 0}</td>
                  <td className="px-3 py-1.5 text-center text-red-400/80">{r.losses ?? 0}</td>
                  <td className="px-3 py-1.5 text-center text-white/30">{r.ties ?? 0}</td>
                  <td className="px-3 py-1.5 text-right text-white/60">{(r.pointsFor ?? 0).toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-white/40">{(r.pointsAgainst ?? 0).toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-center text-white/50">{r.playoffFinish ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Draft (collapsible) */}
      <section>
        <button
          onClick={() => setShowDraft((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white/90 transition"
        >
          <Swords className="h-4 w-4" />Draft Board
          {showDraft ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-xs text-white/30">({data.draftPicks.length} picks)</span>
        </button>
        {showDraft && (
          <div className="mt-2">
            <HistoricalDraftBoard leagueId={leagueId} season={season} />
          </div>
        )}
      </section>

      {/* Weekly Matchups (collapsible) */}
      <section>
        <button
          onClick={() => setShowMatchups((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white/90 transition"
        >
          <ArrowLeftRight className="h-4 w-4" />Weekly Matchups
          {showMatchups ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-xs text-white/30">({weeks.length} weeks)</span>
        </button>
        {showMatchups && (
          <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
            {weeks.map(([week, games]) => (
              <div key={week} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div className="text-xs font-bold text-white/50 mb-1">Week {week}</div>
                <div className="space-y-1">
                  {games.map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className={g.winnerTeamId === g.teamA ? 'text-emerald-400/80 font-medium' : 'text-white/50'}>
                        {nameMap.get(g.teamA) ?? g.teamA}
                      </span>
                      <span className="text-white/30 mx-2">{g.scoreA?.toFixed(1)} - {g.scoreB?.toFixed(1)}</span>
                      <span className={g.winnerTeamId === g.teamB ? 'text-emerald-400/80 font-medium' : 'text-white/50'}>
                        {nameMap.get(g.teamB) ?? g.teamB}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transactions */}
      {data.transactions.length > 0 && (
        <section>
          <div className="text-sm font-semibold text-white/70 mb-2">
            Transactions ({data.transactions.length})
          </div>
          <div className="text-xs text-white/40">
            {data.transactions.length} trades, waivers, and free agent moves recorded.
          </div>
        </section>
      )}
    </div>
  )
}
