'use client'

import { useSurvivorUi } from '@/lib/survivor/SurvivorUiContext'
import { EpisodeCard } from '@/app/survivor/components/EpisodeCard'

export default function SurvivorEpisodesPage() {
  const ctx = useSurvivorUi()
  const n = ctx.season?.players?.length ?? 0

  const weeks = Array.from({ length: Math.max(3, Math.min(ctx.currentWeek + 1, 14)) }, (_, i) => i + 1).slice(-6)

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-10">
      <section className="survivor-panel rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Season timeline</p>
        <h1 className="mt-1 text-xl font-bold text-white">{ctx.leagueName}</h1>
        <p className="mt-2 text-[13px] text-white/55">
          {n} players · {weeks.length} episodes logged (sample) · Week {ctx.currentWeek} active
        </p>
      </section>

      <div className="mt-6 space-y-4">
        {weeks.map((w) => (
          <EpisodeCard
            key={w}
            week={w}
            title={w === ctx.currentWeek ? `Week ${w} — Live` : `Week ${w}`}
            challengeLine="Challenge result posts when commissioner grades."
            tribalLine="Tribal attendance follows immunity outcomes."
            twistsLine={w === ctx.currentWeek ? 'Twists hidden until revealed on the island.' : undefined}
            recap={w % 3 === 0 ? 'AfSub recap copy can expand here for narrative depth.' : undefined}
          />
        ))}
      </div>
    </div>
  )
}
