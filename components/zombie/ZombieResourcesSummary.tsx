'use client'

import { Droplets, Swords, Zap } from 'lucide-react'

export interface ZombieResourcesSummaryProps {
  serums?: number
  weapons?: number
  ambushCount?: number
  bombAvailable?: boolean
}

export function ZombieResourcesSummary({
  serums = 0,
  weapons = 0,
  ambushCount = 0,
  bombAvailable = false,
}: ZombieResourcesSummaryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <Droplets className="h-5 w-5 text-cyan-400" />
        Resources
      </h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
          <Droplets className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-white/80">Serums</span>
          <span className="font-semibold text-white">{serums}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2">
          <Swords className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-white/80">Weapons</span>
          <span className="font-semibold text-white">{weapons}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2">
          <Zap className="h-4 w-4 text-rose-400" />
          <span className="text-sm text-white/80">Ambush</span>
          <span className="font-semibold text-white">{ambushCount}</span>
        </div>
        {bombAvailable && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 px-3 py-2 text-xs font-medium text-orange-200">
            Bomb available
          </div>
        )}
      </div>
    </section>
  )
}
