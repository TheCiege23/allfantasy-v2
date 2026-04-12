'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLevelFromXp, getLevelIcon } from '@/lib/rank/levels'

type RankApiPayload = {
  imported: boolean
  level?: number | null
  levelName?: string | null
  tier?: string | null
  tierGroup?: number | null
  color?: string | null
  bgColor?: string | null
  xpTotal?: number | null
  xpIntoLevel?: number | null
  xpForLevel?: number | null
  progressPct?: number | null
  nextLevelName?: string | null
  careerWins?: number | null
  careerLosses?: number | null
  careerChampionships?: number | null
  careerPlayoffAppearances?: number | null
  careerSeasonsPlayed?: number | null
  careerLeaguesPlayed?: number | null
  rank?: {
    careerXp: string
    aiReportGrade: string
    aiScore: number
    careerTierName: string
    careerLevel: number
    totalWins?: number | null
    totalLosses?: number | null
    totalTies?: number | null
  } | null
}

type RankingsCardProps = {
  onAskChimmy?: () => void
  rankRefreshKey?: number
  onImportNow?: () => void
  /** From dashboard RSC — skip initial loading skeleton when present. */
  initialRankPayload?: Record<string, unknown> | null
}

export function RankingsCard({
  onAskChimmy,
  rankRefreshKey = 0,
  onImportNow,
  initialRankPayload = null,
}: RankingsCardProps) {
  const [data, setData] = useState<RankApiPayload | null>(() =>
    initialRankPayload != null ? (initialRankPayload as RankApiPayload) : null
  )
  const [loading, setLoading] = useState(() => initialRankPayload == null)

  useEffect(() => {
    if (rankRefreshKey === 0 && initialRankPayload != null) {
      setData(initialRankPayload as RankApiPayload)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch('/api/user/rank', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RankApiPayload) => setData(d))
      .catch(() => setData({ imported: false }))
      .finally(() => setLoading(false))
  }, [rankRefreshKey, initialRankPayload])

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
  }

  // ── Not imported yet ──────────────────────────────────────────────
  if (!data?.imported || (!data.rank && data.xpTotal == null)) {
    return (
      <div className="rounded-2xl border border-white/8 border-l-2 border-l-cyan-500 bg-[#0c0c1e] p-5">
        <div className="text-2xl">🏆</div>
        <p className="mt-3 text-sm font-semibold text-white">Import your leagues to unlock your ranking</p>
        <p className="mt-1 text-xs text-white/40">
          Connect Sleeper to build your career profile and earn your rank.
        </p>
        {onImportNow ? (
          <button
            type="button"
            onClick={onImportNow}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            Import Now <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href="/af-rankings"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    )
  }

  // ── Resolve level/XP from API top-level fields (preferred) or rank.careerXp fallback ──
  const xpTotal = data.xpTotal ?? Number(data.rank?.careerXp ?? 0)
  const lv = getLevelFromXp(xpTotal)
  const level = data.level ?? lv.level
  const levelName = data.levelName ?? lv.name
  const color = data.color ?? lv.color
  const xpIntoLevel = data.xpIntoLevel ?? lv.xpIntoLevel
  const xpForLevel = data.xpForLevel ?? lv.xpForLevel
  const progressPct = data.progressPct ?? lv.progressPct
  const nextLevelName = data.nextLevelName ?? lv.nextLevel?.name ?? null
  const icon = getLevelIcon(data.tierGroup ?? lv.tierGroup)

  const wins = data.careerWins ?? data.rank?.totalWins ?? 0
  const losses = data.careerLosses ?? data.rank?.totalLosses ?? 0
  const ties = data.rank?.totalTies ?? 0
  const record = wins + losses + ties > 0
    ? `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`
    : '—'
  const championships = data.careerChampionships ?? 0
  const seasons = data.careerSeasonsPlayed ?? data.rank?.careerXp != null ? (data.careerLeaguesPlayed ?? 0) : 0
  const playoffApps = data.careerPlayoffAppearances ?? 0

  const aiGrade = data.rank?.aiReportGrade ?? '—'
  const aiScore = data.rank?.aiScore ?? null

  return (
    <section data-testid="dashboard-rankings-card">
      <div className="rounded-2xl border border-white/8 border-l-2 border-l-cyan-500 bg-[#0c0c1e] p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">My Ranking</p>
          <div className="flex items-center gap-3">
            {onAskChimmy ? (
              <button
                type="button"
                onClick={onAskChimmy}
                className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
              >
                Ask Chimmy →
              </button>
            ) : null}
          </div>
        </div>

        {/* Level + AI Grade row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl"
              style={{ borderColor: color, background: `${color}22` }}
            >
              {icon}
            </div>
            <div>
              <div className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
                {level}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-white/80">{levelName}</p>
              <p className="text-[11px] text-white/40">{data.tier ?? ''}</p>
            </div>
          </div>

          {/* AI Grade */}
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <div className="min-w-[54px] rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-center">
              <div className="text-xl font-black leading-none text-violet-300">{aiGrade}</div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/35">AI Grade</div>
            </div>
            {aiScore != null ? (
              <div className="text-center">
                <span className="text-sm font-bold text-white/80">{aiScore}</span>
                <span className="text-[10px] text-white/30">/100</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/45">
            <span>{xpIntoLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP in level</span>
            <span>{progressPct}%{nextLevelName ? ` → ${nextLevelName}` : ''}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: color }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/30">
            {xpTotal.toLocaleString()} total XP
          </p>
        </div>

        {/* Career stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Record', value: record },
            { label: 'Titles', value: String(championships) },
            { label: 'Playoffs', value: String(playoffApps) },
            { label: 'Seasons', value: String(seasons) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-white/35">{stat.label}</div>
              <div className="mt-0.5 text-sm font-bold text-white/80">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/af-rankings"
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            View full rankings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
