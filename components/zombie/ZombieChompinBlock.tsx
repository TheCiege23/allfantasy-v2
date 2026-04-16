'use client'

import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'

export interface ZombieChompinBlockProps {
  candidates: string[]
  displayNames: Record<string, string>
  week?: number
}

export function ZombieChompinBlock({ candidates, displayNames, week }: ZombieChompinBlockProps) {
  const active = candidates.length > 0
  return (
    <section
      className={clsx(
        'zombie-glass rounded-2xl border p-4 sm:p-6',
        active ? 'zombie-chompin-alert border-red-500/35' : 'border-amber-500/25 bg-amber-950/15',
      )}
      data-testid="zombie-chompin-block"
    >
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-100">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        On the Chompin&apos; Block
      </h2>
      <p className="mb-3 text-xs text-white/50">
        Survivors in danger this week {week != null ? `(Week ${week})` : ''}.
      </p>
      {!candidates.length ? (
        <p className="text-sm text-white/50">No one on the block right now.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((rosterId) => (
            <li
              key={rosterId}
              className="rounded-lg border border-amber-500/20 bg-black/20 px-3 py-2 text-sm font-medium text-amber-100"
            >
              {displayNames[rosterId] ?? rosterId}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
