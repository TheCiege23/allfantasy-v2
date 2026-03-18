'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface MovementItem {
  rosterId: string
  leagueId: string
  reason: string
  projectedLevelId: string | null
}

export interface ZombieMovementOutlookProps {
  movementWatch: MovementItem[]
  displayNames: Record<string, string>
}

export function ZombieMovementOutlook({ movementWatch, displayNames }: ZombieMovementOutlookProps) {
  const promotion = movementWatch.filter((m) => m.reason === 'promotion')
  const relegation = movementWatch.filter((m) => m.reason === 'relegation')
  const watch = movementWatch.filter((m) => m.reason === 'watch')

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold text-white">Movement Outlook</h2>
      <p className="mb-4 text-xs text-white/50">Projected level for next season.</p>
      <div className="space-y-3">
        {promotion.length > 0 && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <TrendingUp className="h-4 w-4" /> Promotion watch
            </p>
            <ul className="space-y-1">
              {promotion.map((m) => (
                <li key={m.rosterId} className="text-sm text-white/90">
                  {displayNames[m.rosterId] ?? m.rosterId}
                </li>
              ))}
            </ul>
          </div>
        )}
        {relegation.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <TrendingDown className="h-4 w-4" /> Relegation watch
            </p>
            <ul className="space-y-1">
              {relegation.map((m) => (
                <li key={m.rosterId} className="text-sm text-white/90">
                  {displayNames[m.rosterId] ?? m.rosterId}
                </li>
              ))}
            </ul>
          </div>
        )}
        {watch.length > 0 && watch.length <= 10 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs text-white/50">
              <Minus className="h-4 w-4" /> Holding
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              {watch.slice(0, 5).map((m) => (
                <li key={m.rosterId}>{displayNames[m.rosterId] ?? m.rosterId}</li>
              ))}
              {watch.length > 5 && <li className="text-white/50">+{watch.length - 5} more</li>}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
