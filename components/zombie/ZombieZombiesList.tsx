'use client'

import { Skull } from 'lucide-react'

export interface ZombieZombiesListProps {
  zombies: string[]
  displayNames: Record<string, string>
}

export function ZombieZombiesList({ zombies, displayNames }: ZombieZombiesListProps) {
  return (
    <section className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-200">
        <Skull className="h-5 w-5" />
        Zombie Horde
      </h2>
      <p className="mb-3 text-xs text-white/50">Infected; can maul and spread infection.</p>
      {!zombies.length ? (
        <p className="text-sm text-white/50">No zombies yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {zombies.map((rosterId) => (
            <li
              key={rosterId}
              className="rounded-lg border border-rose-500/20 bg-black/20 px-3 py-2 text-sm text-rose-100"
            >
              {displayNames[rosterId] ?? rosterId}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
