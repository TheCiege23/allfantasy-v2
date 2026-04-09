'use client'

import { useCallback, useEffect, useState } from 'react'
import { Skull, Shield, AlertTriangle, Trophy, TrendingDown, Users } from 'lucide-react'
import type { SupportedSport } from '@/lib/sport-scope'

type Sub = 'board' | 'team' | 'waivers' | 'history' | 'storylines'

interface SurvivalEntry {
  rosterId: string
  teamName: string
  ownerName: string
  score: number
  rank: number
  dangerTier: 'safe' | 'danger' | 'chop_zone'
  margin: number
  isEliminated: boolean
}

interface WaiverRelease {
  playerId: string
  playerName: string
  position: string
  team: string
  releaseStatus: string
  winningBid: number | null
  claimedByRosterId: string | null
}

interface EliminationEntry {
  scoringPeriod: number
  eliminatedTeamName: string
  finalScore: number
  marginBelowSafe: number
  wasTiebreaker: boolean
  aiEliminationSummary: string | null
}

export type GuillotineTabProps = {
  leagueId: string
  sport: SupportedSport | string
}

export function GuillotineTab({ leagueId, sport }: GuillotineTabProps) {
  const [sub, setSub] = useState<Sub>('board')
  const [standings, setStandings] = useState<SurvivalEntry[]>([])
  const [releases, setReleases] = useState<WaiverRelease[]>([])
  const [history, setHistory] = useState<EliminationEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [standingsRes, releasesRes, historyRes] = await Promise.all([
        fetch(`/api/guillotine/standings?leagueId=${leagueId}`).then((r) => r.json()).catch(() => ({ standings: [] })),
        fetch(`/api/guillotine/releases?leagueId=${leagueId}`).then((r) => r.json()).catch(() => ({ releases: [] })),
        fetch(`/api/guillotine/history?leagueId=${leagueId}`).then((r) => r.json()).catch(() => ({ eliminations: [] })),
      ])
      setStandings(standingsRes.standings ?? [])
      setReleases(releasesRes.releases ?? [])
      setHistory(historyRes.eliminations ?? [])
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { fetchData() }, [fetchData])

  const activeTeams = standings.filter((s) => !s.isEliminated)
  const chopLine = activeTeams.length > 0 ? activeTeams[activeTeams.length - 1]! : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-[#e6edf3]">
      {/* Header */}
      <div className="rounded-xl border border-red-500/20 bg-[#0a1228]/90 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300/90">Guillotine Survival</p>
        <h2 className="mt-1 text-lg font-bold text-white">Lowest score each period is eliminated</h2>
        <div className="mt-2 flex gap-4 text-xs text-white/50">
          <span><Users className="inline h-3 w-3 mr-1" />{activeTeams.length} active</span>
          <span><Skull className="inline h-3 w-3 mr-1" />{standings.length - activeTeams.length} eliminated</span>
          <span className="capitalize">{String(sport)}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {([
          ['board', 'Survival Board'],
          ['team', 'My Team'],
          ['waivers', 'Waiver Pool'],
          ['history', 'History'],
          ['storylines', 'Storylines'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              sub === id ? 'bg-red-500/20 text-red-100' : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-white/40">Loading...</div>}

      {/* Survival Board */}
      {sub === 'board' && !loading && (
        <div className="space-y-1.5">
          {activeTeams.map((team, i) => (
            <div key={team.rosterId}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                team.dangerTier === 'chop_zone'
                  ? 'border-red-500/40 bg-red-500/10 text-red-100'
                  : team.dangerTier === 'danger'
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-100'
                    : 'border-white/10 bg-white/[0.03] text-white/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-white/40">{i + 1}</span>
                {team.dangerTier === 'chop_zone' && <Skull className="h-4 w-4 text-red-400" />}
                {team.dangerTier === 'danger' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                {team.dangerTier === 'safe' && i === 0 && <Trophy className="h-4 w-4 text-emerald-400" />}
                {team.dangerTier === 'safe' && i > 0 && <Shield className="h-4 w-4 text-emerald-400/50" />}
                <div>
                  <div className="font-medium">{team.teamName}</div>
                  <div className="text-xs text-white/40">{team.ownerName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{team.score.toFixed(1)}</div>
                <div className={`text-xs ${team.margin > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                  {team.margin > 0 ? `+${team.margin.toFixed(1)}` : team.margin.toFixed(1)} from chop
                </div>
              </div>
            </div>
          ))}
          {chopLine && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-center text-xs text-red-300/70">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              Chop line: {chopLine.score.toFixed(1)} pts — {chopLine.teamName}
            </div>
          )}
        </div>
      )}

      {/* Waiver Pool */}
      {sub === 'waivers' && !loading && (
        <div className="space-y-1.5">
          {releases.length === 0 ? (
            <div className="text-sm text-white/40">No eliminated players in the waiver pool yet.</div>
          ) : (
            releases.map((r) => (
              <div key={r.playerId} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm">
                <div>
                  <span className="font-medium text-white/80">{r.playerName}</span>
                  <span className="ml-2 text-xs text-white/40">{r.position} · {r.team}</span>
                </div>
                <div className="text-xs">
                  {r.claimedByRosterId ? (
                    <span className="text-emerald-400/70">Claimed{r.winningBid ? ` ($${r.winningBid})` : ''}</span>
                  ) : (
                    <span className="text-amber-300/60">{r.releaseStatus}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {sub === 'history' && !loading && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-sm text-white/40">No eliminations yet.</div>
          ) : (
            history.map((e, i) => (
              <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skull className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-100">{e.eliminatedTeamName}</span>
                  </div>
                  <span className="text-xs text-white/40">Period {e.scoringPeriod}</span>
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Score: {e.finalScore.toFixed(1)} ({e.marginBelowSafe.toFixed(1)} below safe)
                  {e.wasTiebreaker && ' · Tiebreaker'}
                </div>
                {e.aiEliminationSummary && (
                  <div className="mt-2 text-xs text-white/40 italic">{e.aiEliminationSummary}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* My Team */}
      {sub === 'team' && !loading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
          Your roster, survival rank, FAAB balance, and floor-focused recommendations appear here.
          Check the main Roster tab for full lineup management.
        </div>
      )}

      {/* Storylines */}
      {sub === 'storylines' && !loading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
          AI-generated dramatic recaps, elimination stories, and waiver wars require the AF Commissioner Subscription.
        </div>
      )}
    </div>
  )
}
