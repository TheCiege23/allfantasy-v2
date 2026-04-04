'use client'

import { ZombieStatusBadge } from './ZombieStatusBadge'

export function ZombieMatchupCard({
  homeName,
  awayName,
  homeStatus,
  awayStatus,
  homeScore,
  awayScore,
  infectionRisk,
}: {
  homeName: string
  awayName: string
  homeStatus: string
  awayStatus: string
  homeScore?: number | null
  awayScore?: number | null
  infectionRisk?: 'home' | 'away' | 'none'
}) {
  return (
    <div className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--zombie-text-full)]">{homeName}</span>
            <ZombieStatusBadge status={homeStatus} compact />
            {infectionRisk === 'home' ? (
              <span className="rounded bg-[var(--zombie-red)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--zombie-red)]">
                Infection risk
              </span>
            ) : null}
          </div>
          <p className="text-2xl font-bold text-white/90">{homeScore ?? '—'}</p>
        </div>
        <div className="text-center text-[11px] text-[var(--zombie-text-dim)]">vs</div>
        <div className="flex-1 space-y-1 text-right sm:text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {infectionRisk === 'away' ? (
              <span className="rounded bg-[var(--zombie-red)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--zombie-red)]">
                Infection risk
              </span>
            ) : null}
            <ZombieStatusBadge status={awayStatus} compact />
            <span className="font-medium text-[var(--zombie-text-full)]">{awayName}</span>
          </div>
          <p className="text-2xl font-bold text-white/90">{awayScore ?? '—'}</p>
        </div>
      </div>
    </div>
  )
}
