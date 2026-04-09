'use client'

import { useEffect, useState } from 'react'

interface RockDrawEntry {
  rosterId: string
  displayName: string
  drewPurpleRock: boolean
}

interface SurvivorRocksRevealProps {
  drawOrder: RockDrawEntry[]
  eliminatedName: string
  onComplete?: () => void
}

export function SurvivorRocksReveal({ drawOrder, eliminatedName, onComplete }: SurvivorRocksRevealProps) {
  const [revealIndex, setRevealIndex] = useState(-1)
  const [showFinal, setShowFinal] = useState(false)

  useEffect(() => {
    if (revealIndex < drawOrder.length - 1) {
      const timer = setTimeout(() => setRevealIndex((i) => i + 1), 2500)
      return () => clearTimeout(timer)
    } else if (revealIndex === drawOrder.length - 1 && !showFinal) {
      const timer = setTimeout(() => setShowFinal(true), 3000)
      return () => clearTimeout(timer)
    } else if (showFinal) {
      const timer = setTimeout(() => onComplete?.(), 4000)
      return () => clearTimeout(timer)
    }
  }, [revealIndex, showFinal, drawOrder.length, onComplete])

  return (
    <div className="space-y-4">
      <div className="text-center text-lg font-bold text-red-400">Go to Rocks</div>
      <div className="text-center text-xs text-white/50">
        Tied players are safe. Everyone else draws a rock.
      </div>

      <div className="space-y-2">
        {drawOrder.map((entry, index) => {
          const revealed = index <= revealIndex
          return (
            <div
              key={entry.rosterId}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-700 ${
                !revealed
                  ? 'border-white/5 bg-white/[0.02] text-white/30'
                  : entry.drewPurpleRock
                    ? 'border-purple-500/60 bg-purple-500/20 text-purple-100'
                    : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              }`}
            >
              <span className={`font-medium ${!revealed ? 'blur-sm' : ''}`}>
                {revealed ? entry.displayName : '???'}
              </span>
              <span className="text-xs">
                {revealed
                  ? entry.drewPurpleRock
                    ? 'PURPLE ROCK'
                    : 'Safe'
                  : '...'}
              </span>
            </div>
          )
        })}
      </div>

      {showFinal && (
        <div className="mt-4 animate-pulse rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-center">
          <div className="text-xs uppercase tracking-wide text-red-300/60">Eliminated</div>
          <div className="mt-1 text-lg font-bold text-red-100">{eliminatedName}</div>
          <div className="mt-1 text-xs text-red-300/50">drew the purple rock</div>
        </div>
      )}
    </div>
  )
}
