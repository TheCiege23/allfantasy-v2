'use client'

import { Droplets, Swords, Zap, Info } from 'lucide-react'

export interface ZombieResourcesViewProps {
  serums: number
  weapons: number
  ambushCount: number
  bombAvailable: boolean
  serumReviveCount: number
  displayNames: Record<string, string>
}

export function ZombieResourcesView({
  serums,
  weapons,
  ambushCount,
  bombAvailable,
  serumReviveCount,
}: ZombieResourcesViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-cyan-200">
          <Droplets className="h-5 w-5" />
          Serums
        </h2>
        <p className="mb-2 text-sm text-white/80">You have <strong>{serums}</strong> serum(s).</p>
        <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          Use {serumReviveCount} serums to revive from Zombie back to Survivor. Use before your last starter locks.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-200">
          <Swords className="h-5 w-5" />
          Weapons
        </h2>
        <p className="mb-2 text-sm text-white/80">You have <strong>{weapons}</strong> weapon(s).</p>
        <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          Top two active; score-threshold awards. Zombies cannot wield unless revived. Transfer/take after results.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-200">
          <Zap className="h-5 w-5" />
          Ambush
        </h2>
        <p className="mb-2 text-sm text-white/80">Available: <strong>{ambushCount}</strong>.</p>
        <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          Whisperer can remap current week matchups within the legal timing window. No remap after a team has started a player.
        </p>
      </section>

      {bombAvailable && (
        <section className="rounded-2xl border border-orange-500/40 bg-orange-950/20 p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-orange-200">Bomb</h2>
          <p className="text-sm text-white/80">One-time override available per league rules.</p>
        </section>
      )}
    </div>
  )
}
