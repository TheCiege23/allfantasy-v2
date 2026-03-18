'use client'

import { Coins } from 'lucide-react'

export interface ZombieWinningsSummaryProps {
  totalWinnings?: number
  weekWinnings?: number
  myRosterId?: string
  byRoster?: Record<string, number>
}

export function ZombieWinningsSummary({
  totalWinnings = 0,
  weekWinnings,
  myRosterId,
  byRoster = {},
}: ZombieWinningsSummaryProps) {
  const myTotal = myRosterId != null ? byRoster[myRosterId] ?? 0 : totalWinnings
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <Coins className="h-5 w-5 text-amber-400" />
        Weekly Winnings
      </h2>
      <div className="flex flex-wrap gap-4">
        {myRosterId != null && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-2">
            <p className="text-xs text-amber-400/80">Your total</p>
            <p className="text-lg font-semibold text-white">{myTotal.toFixed(1)}</p>
          </div>
        )}
        {weekWinnings != null && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <p className="text-xs text-white/50">This week</p>
            <p className="text-lg font-semibold text-white/90">{weekWinnings.toFixed(1)}</p>
          </div>
        )}
      </div>
    </section>
  )
}
