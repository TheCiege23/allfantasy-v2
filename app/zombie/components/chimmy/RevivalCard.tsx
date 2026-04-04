'use client'

import Link from 'next/link'

export function RevivalCard({
  leagueId,
  serumCount,
  reviveThreshold,
}: {
  leagueId: string
  serumCount: number
  reviveThreshold: number
}) {
  if (serumCount < reviveThreshold) return null

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
      <p className="text-[13px] font-bold text-amber-100">⚡ You have enough serums to revive</p>
      <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">
        {reviveThreshold} required — you hold {serumCount}. You become a Revived Survivor; you can be re-infected.
      </p>
      <Link
        href={`/league/${leagueId}?zombieChimmy=${encodeURIComponent('@Chimmy revive')}`}
        className="mt-3 flex min-h-[56px] items-center justify-center rounded-xl bg-amber-500/35 text-[14px] font-bold text-amber-50 hover:bg-amber-500/45"
      >
        ⚡ Revive Me
      </Link>
    </div>
  )
}
