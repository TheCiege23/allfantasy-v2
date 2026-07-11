'use client'

import Link from 'next/link'
import { Crown, Calendar, Users, Star } from 'lucide-react'

/**
 * Phase 4.3 Rankings UI — small horizontal strip that visualizes REAL career
 * fields from the `/api/user/rank` payload:
 *   - careerChampionships
 *   - careerPlayoffAppearances
 *   - careerSeasonsPlayed
 *   - careerLeaguesPlayed
 *
 * Real data only — no fake milestones, no invented progression steps. When the
 * payload has no career fields (unimported profile) the strip self-gates to
 * nothing so it doesn't add empty noise to the dashboard.
 *
 * Sleeper only in practice (the audit confirmed the rank domain is fed by
 * account-linking + the Sleeper legacy_sleeper flow via §5).
 */

type CareerFields = {
  careerChampionships?: number | null
  careerPlayoffAppearances?: number | null
  careerSeasonsPlayed?: number | null
  careerLeaguesPlayed?: number | null
}

export function CareerProgressionStrip({ rankPayload }: { rankPayload: CareerFields | null | undefined }) {
  const c = rankPayload?.careerChampionships
  const p = rankPayload?.careerPlayoffAppearances
  const s = rankPayload?.careerSeasonsPlayed
  const l = rankPayload?.careerLeaguesPlayed

  const anyValue =
    (typeof c === 'number' && c > 0) ||
    (typeof p === 'number' && p > 0) ||
    (typeof s === 'number' && s > 0) ||
    (typeof l === 'number' && l > 0)

  if (!anyValue) return null

  return (
    <section
      data-testid="career-progression-strip"
      className="warroom-card warroom-fade-in-stagger overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]" aria-hidden />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
            Career Progression
          </p>
        </div>
        <Link
          href="/af-rankings"
          className="warroom-pressable text-[10px] font-black uppercase tracking-wider text-cyan-400/70 hover:text-cyan-300"
        >
          View rankings →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
        <ProgressionCell
          icon={<Crown className="h-3.5 w-3.5 text-amber-300" aria-hidden />}
          label="Championships"
          value={typeof c === 'number' ? c : 0}
          tone="text-amber-300"
        />
        <ProgressionCell
          icon={<Star className="h-3.5 w-3.5 text-violet-300" aria-hidden />}
          label="Playoffs"
          value={typeof p === 'number' ? p : 0}
          tone="text-violet-300"
        />
        <ProgressionCell
          icon={<Calendar className="h-3.5 w-3.5 text-emerald-300" aria-hidden />}
          label="Seasons"
          value={typeof s === 'number' ? s : 0}
          tone="text-emerald-300"
        />
        <ProgressionCell
          icon={<Users className="h-3.5 w-3.5 text-blue-300" aria-hidden />}
          label="Leagues"
          value={typeof l === 'number' ? l : 0}
          tone="text-blue-300"
        />
      </div>
    </section>
  )
}

function ProgressionCell({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="border-b border-r border-white/[0.05] px-4 py-3 last:border-r-0 sm:border-b-0">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-wider text-white/45">{label}</p>
      </div>
      <p className={`text-[18px] font-black tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}
