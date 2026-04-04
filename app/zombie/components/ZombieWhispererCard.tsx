'use client'

import clsx from 'clsx'

export function ZombieWhispererCard({
  revealed,
  displayName,
  ambushesRemaining,
  hordeSize,
}: {
  revealed: boolean
  displayName?: string | null
  ambushesRemaining: number
  hordeSize: number
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-4',
        'border-[var(--zombie-crimson)]/55 bg-[var(--zombie-crimson)]/10 shadow-[var(--zombie-glow-red)]',
      )}
    >
      {revealed ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-crimson)]">
            The Whisperer
          </p>
          <p className="mt-1 text-lg font-bold text-[var(--zombie-text-full)]">{displayName ?? 'Unknown'}</p>
          <p className="mt-2 text-[12px] text-[var(--zombie-text-mid)]">
            Ambushes: {ambushesRemaining} · Horde command: {hordeSize} zombies
          </p>
        </>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-crimson)]">
            Unknown identity
          </p>
          <p className="mt-2 text-[13px] text-[var(--zombie-text-mid)]">
            🎭 A Whisperer walks among you. Trust no one.
          </p>
        </>
      )}
    </div>
  )
}
