'use client'

import { Shield } from 'lucide-react'

export interface ZombieSurvivorsListProps {
  survivors: string[]
  displayNames: Record<string, string>
}

export function ZombieSurvivorsList({ survivors, displayNames }: ZombieSurvivorsListProps) {
  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-emerald-200">
        <Shield className="h-5 w-5" />
        Survivors
      </h2>
      <p className="mb-3 text-xs text-white/50">Alive; can be infected by loss to Whisperer or Zombie.</p>
      {!survivors.length ? (
        <p className="text-sm text-white/50">No survivors listed.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {survivors.map((rosterId) => (
            <li
              key={rosterId}
              className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-white/90"
            >
              {displayNames[rosterId] ?? rosterId}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
