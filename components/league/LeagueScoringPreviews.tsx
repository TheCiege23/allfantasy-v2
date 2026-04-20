'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Swords } from 'lucide-react'

type StandingsPreview = { teamName: string; wins: number; losses: number; pointsFor: number; rank: number | null }
type MatchPreview = { teamName: string; totalPoints: number; opponentName: string | null; winLoss: string | null }
type SeedPreview = { seed: number | null; teamName: string; pointsFor: number }

export default function LeagueScoringPreviews({
  leagueId,
  season,
  week = 1,
}: {
  leagueId: string
  season: number
  week?: number
}) {
  const [standings, setStandings] = useState<StandingsPreview[]>([])
  const [matchups, setMatchups] = useState<MatchPreview[]>([])
  const [seeds, setSeeds] = useState<SeedPreview[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [sRes, mRes, pRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/scoring/standings?season=${season}`),
          fetch(`/api/leagues/${leagueId}/scoring/matchups?season=${season}&week=${week}`),
          fetch(`/api/leagues/${leagueId}/scoring/playoff-seeds?season=${season}`),
        ])
        const sJson = await sRes.json().catch(() => ({}))
        const mJson = await mRes.json().catch(() => ({}))
        const pJson = await pRes.json().catch(() => ({}))
        if (cancelled) return
        const st = Array.isArray(sJson.standings) ? sJson.standings : []
        setStandings(
          st.slice(0, 4).map(
            (r: { teamName: string; wins: number; losses: number; pointsFor: number; rank: number | null }) => ({
              teamName: r.teamName,
              wins: r.wins,
              losses: r.losses,
              pointsFor: r.pointsFor,
              rank: r.rank,
            }),
          ),
        )
        const mx = Array.isArray(mJson.matchups) ? mJson.matchups : []
        setMatchups(
          mx.slice(0, 4).map(
            (r: { teamName: string; totalPoints: number; opponentName: string | null; winLoss: string | null }) => ({
              teamName: r.teamName,
              totalPoints: r.totalPoints,
              opponentName: r.opponentName,
              winLoss: r.winLoss,
            }),
          ),
        )
        const sd = Array.isArray(pJson.seeds) ? pJson.seeds : []
        setSeeds(
          sd.slice(0, 6).map(
            (r: { seed: number | null; teamName: string; pointsFor: number }) => ({
              seed: r.seed,
              teamName: r.teamName,
              pointsFor: r.pointsFor,
            }),
          ),
        )
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId, season, week])

  if (!loaded) {
    return (
      <div className="mb-4 h-24 animate-pulse rounded-2xl border border-[#1E2A42] bg-[#131929]/80" aria-hidden />
    )
  }

  const hasData = standings.length > 0 || matchups.length > 0 || seeds.length > 0

  return (
    <section className="mb-6 space-y-3" data-testid="league-scoring-previews">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8B9DB8]">Scoring & results</h3>
        <div className="flex gap-2">
          <Link
            href={`/league/${leagueId}/standings`}
            className="inline-flex items-center gap-1 rounded-full border border-[#1E2A42] bg-[#131929] px-3 py-1.5 text-[12px] font-semibold text-white hover:border-cyan-400/40"
          >
            <BarChart3 className="h-3.5 w-3.5 text-cyan-300" />
            Standings
          </Link>
          <Link
            href={`/league/${leagueId}/matchups`}
            className="inline-flex items-center gap-1 rounded-full border border-[#1E2A42] bg-[#131929] px-3 py-1.5 text-[12px] font-semibold text-white hover:border-cyan-400/40"
          >
            <Swords className="h-3.5 w-3.5 text-fuchsia-300" />
            Matchups
          </Link>
        </div>
      </div>

      {!hasData ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white/50">
          Weekly scoring will populate here after stats are processed (commissioner: run process-week).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {seeds.length > 0 ? (
            <div className="rounded-xl border border-fuchsia-500/20 bg-[#131929] p-3 sm:col-span-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-200/80">
                Playoff seed preview
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/85">
                {seeds.map((s) => (
                  <li key={`${s.seed}-${s.teamName}`}>
                    <span className="text-white/40">{s.seed}.</span> {s.teamName}{' '}
                    <span className="text-white/50">({s.pointsFor.toFixed(1)} PF)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-xl border border-[#1E2A42] bg-[#131929] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B9DB8]">Standings snapshot</p>
            <ul className="space-y-1.5 text-[13px] text-white/90">
              {standings.map((s) => (
                <li key={s.teamName} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="mr-2 text-white/40">{s.rank ?? '—'}.</span>
                    {s.teamName}
                  </span>
                  <span className="shrink-0 text-white/60">
                    {s.wins}-{s.losses} · {s.pointsFor.toFixed(1)} PF
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[#1E2A42] bg-[#131929] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B9DB8]">
              Week {week} matchups
            </p>
            <ul className="space-y-1.5 text-[13px] text-white/90">
              {matchups.map((m) => (
                <li key={`${m.teamName}-${m.opponentName}`} className="flex justify-between gap-2">
                  <span className="truncate">
                    {m.teamName}
                    {m.opponentName ? <span className="text-white/45"> vs {m.opponentName}</span> : null}
                  </span>
                  <span className="shrink-0 font-semibold text-cyan-200/90">
                    {m.totalPoints.toFixed(1)}
                    {m.winLoss ? <span className="ml-1 text-[11px] text-white/45">({m.winLoss})</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
