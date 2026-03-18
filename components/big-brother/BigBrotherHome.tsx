'use client'

/**
 * [NEW] Big Brother league home (Overview replacement). Placeholder until full game loop UI. PROMPT 2/6.
 */

export interface BigBrotherHomeProps {
  leagueId: string
}

export function BigBrotherHome({ leagueId }: BigBrotherHomeProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/90">
      <h2 className="text-lg font-semibold">Big Brother</h2>
      <p className="mt-2 text-sm text-white/60">
        HOH, nominations, veto, and eviction flow are configured. Use Settings → Big Brother Settings to adjust deadlines and options.
      </p>
      <a
        href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings`}
        className="mt-3 inline-block text-sm text-white/80 underline hover:text-white"
      >
        Open league settings
      </a>
    </div>
  )
}
