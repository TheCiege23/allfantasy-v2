'use client'

import { useEffect, useState } from 'react'
import { HistoricalDraftBoard } from './HistoricalDraftBoard'

type WeeklyMatchup = {
  matchupId: string
  weekOrPeriod: number
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  winnerTeamId: string | null
}

type TransactionRow = {
  transactionId: string
  type: string
  playerId: string | null
  managerId: string | null
  rosterId: string | null
  payload: unknown
  weekOrPeriod: number | null
  createdAt: string
}

type StandingRow = {
  managerName?: string
  rosterId?: number | string
  wins?: number
  losses?: number
  ties?: number
  pointsFor?: number
  pointsAgainst?: number
}

type ApiResponse = {
  season: number
  standings: StandingRow[]
  weeklyMatchups: WeeklyMatchup[]
  draft: unknown[]
  transactions: TransactionRow[]
  scoringSettings: { scoringFormat: string | null; isDynasty: boolean; teamCount: number | null }
  meta: {
    championName: string | null
    championAvatar: string | null
    runnerUpName: string | null
    regularSeasonWinnerName: string | null
    status: string | null
  } | null
}

export type SeasonDetailViewProps = {
  leagueId: string
  season: number
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/55 hover:text-white/80"
      >
        <span>{title}</span>
        <span className="text-white/40">{open ? '▲' : '▼'}</span>
      </button>
      {open ? <div className="border-t border-white/[0.06] p-3">{children}</div> : null}
    </div>
  )
}

export function SeasonDetailView({ leagueId, season }: SeasonDetailViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/league/${encodeURIComponent(leagueId)}/season-history?season=${season}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Failed to load season')
        if (!cancelled) setData(body as ApiResponse)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leagueId, season])

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.06]" />
        ))}
      </div>
    )
  }

  if (error) return <div className="p-3 text-xs text-rose-300/90">{error}</div>
  if (!data) return null

  const standings = Array.isArray(data.standings) ? data.standings : []
  const sorted = [...standings].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0))

  return (
    <div className="mt-3 space-y-2">
      <Section title="Standings" defaultOpen>
        <ul className="space-y-1 text-[11px] text-white/75">
          {sorted.map((row, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2">
              <span className="text-white/50">
                {idx + 1}. {row.managerName ?? `Team ${row.rosterId ?? idx + 1}`}
              </span>
              <span>
                {row.wins ?? 0}-{row.losses ?? 0}
                {row.ties ? `-${row.ties}` : ''} · {(row.pointsFor ?? 0).toFixed(1)} pts
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Weekly Matchups">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.weeklyMatchups.map((m) => (
            <div
              key={m.matchupId}
              className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/70"
            >
              <div className="text-[10px] uppercase text-white/35">Week {m.weekOrPeriod}</div>
              <div className="flex justify-between">
                <span className={m.winnerTeamId === m.teamA ? 'font-bold text-emerald-300' : ''}>
                  {m.teamA}
                </span>
                <span>{m.scoreA.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className={m.winnerTeamId === m.teamB ? 'font-bold text-emerald-300' : ''}>
                  {m.teamB}
                </span>
                <span>{m.scoreB.toFixed(1)}</span>
              </div>
            </div>
          ))}
          {data.weeklyMatchups.length === 0 ? (
            <div className="text-[11px] text-white/35">No matchups recorded.</div>
          ) : null}
        </div>
      </Section>

      <Section title="Draft">
        <HistoricalDraftBoard leagueId={leagueId} season={season} />
      </Section>

      <Section title="Trades & Transactions">
        <ul className="space-y-1 text-[11px] text-white/70">
          {data.transactions.slice(0, 50).map((t) => (
            <li key={t.transactionId} className="flex items-center justify-between gap-2">
              <span className="text-white/50">
                {t.type}
                {t.weekOrPeriod != null ? ` · W${t.weekOrPeriod}` : ''}
              </span>
              <span className="truncate text-white/60">
                {t.playerId ?? ''} {t.managerId ? `→ ${t.managerId}` : ''}
              </span>
            </li>
          ))}
          {data.transactions.length === 0 ? (
            <li className="text-white/35">No transactions recorded.</li>
          ) : null}
        </ul>
      </Section>
    </div>
  )
}

export default SeasonDetailView
