'use client'

import Link from 'next/link'

export function BashingDecisionCard({
  leagueId,
  loserName,
  margin,
  hoursLeft,
}: {
  leagueId: string
  loserName: string
  margin: number
  hoursLeft?: number
}) {
  return (
    <div className="rounded-xl border-l-4 border-orange-500 bg-orange-500/10 p-4">
      <p className="text-[13px] font-bold text-orange-100">🔥 You bashed {loserName} by {margin.toFixed(1)} pts</p>
      <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">Spare or infect? If no choice by deadline, spare (league default).</p>
      {hoursLeft != null ? (
        <p className="mt-1 text-[11px] text-amber-200/90">Decide in ~{hoursLeft}h</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/league/${leagueId}?zombieChimmy=${encodeURIComponent('@Chimmy bashing spare')}`}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-white/10 text-[13px] font-semibold text-white"
        >
          🤝 Spare
        </Link>
        <Link
          href={`/league/${leagueId}?zombieChimmy=${encodeURIComponent('@Chimmy bashing infect')}`}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-orange-600/40 text-[13px] font-semibold text-white"
        >
          🧟 Infect
        </Link>
      </div>
    </div>
  )
}
