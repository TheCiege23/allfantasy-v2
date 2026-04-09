'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RevealStep {
  type: 'vote' | 'does_not_count' | 'pause'
  voterName?: string
  targetName?: string
}

interface SurvivorScrollRevealProps {
  sequence: RevealStep[]
  eliminatedName?: string
  mode?: 'dramatic' | 'full_public' | 'anonymized' | 'delayed'
  autoPlay?: boolean
  onComplete?: () => void
}

const VOTE_DELAY_MS = 2800
const PAUSE_DELAY_MS = 1800
const FINAL_DELAY_MS = 3500

export function SurvivorScrollReveal({
  sequence,
  eliminatedName,
  mode = 'dramatic',
  autoPlay = true,
  onComplete,
}: SurvivorScrollRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showElimination, setShowElimination] = useState(false)
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [isPlaying, setIsPlaying] = useState(autoPlay)

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1
      if (next >= sequence.length) return prev
      const step = sequence[next]
      if (step?.type === 'vote' && step.targetName) {
        setVoteCounts((counts) => ({
          ...counts,
          [step.targetName!]: (counts[step.targetName!] ?? 0) + 1,
        }))
      }
      return next
    })
  }, [sequence])

  useEffect(() => {
    if (!isPlaying) return
    if (currentIndex >= sequence.length - 1) {
      const timer = setTimeout(() => {
        setShowElimination(true)
        setTimeout(() => onComplete?.(), FINAL_DELAY_MS)
      }, VOTE_DELAY_MS)
      return () => clearTimeout(timer)
    }
    const step = sequence[currentIndex + 1]
    const delay = step?.type === 'pause' ? PAUSE_DELAY_MS : VOTE_DELAY_MS
    const timer = setTimeout(advance, currentIndex === -1 ? 1200 : delay)
    return () => clearTimeout(timer)
  }, [currentIndex, isPlaying, sequence, advance, onComplete])

  // Vote count leaderboard (sorted descending)
  const sortedTargets = Object.entries(voteCounts).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-amber-300">The votes are in...</div>
        {!autoPlay && (
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-white/20"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        )}
      </div>

      {/* Vote count tracker */}
      {sortedTargets.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">Vote Count</div>
          <div className="space-y-1.5">
            {sortedTargets.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="flex-1 text-sm text-white/80">{name}</div>
                <div className="flex gap-0.5">
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 w-3 rounded-sm bg-red-500/80 transition-all duration-500"
                    />
                  ))}
                </div>
                <div className="w-6 text-right text-xs font-bold text-red-300">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reveal sequence */}
      <div className="space-y-1.5">
        {sequence.map((step, index) => {
          if (step.type === 'pause') return null
          const isRevealed = index <= currentIndex
          const isCurrent = index === currentIndex
          const isAnonymized = mode === 'anonymized'

          if (!isRevealed) {
            return (
              <div
                key={index}
                className="rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-sm text-white/20"
              >
                ...
              </div>
            )
          }

          if (step.type === 'does_not_count') {
            return (
              <div
                key={index}
                className={`rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 text-sm text-yellow-200/60 transition-all duration-700 ${
                  isCurrent ? 'scale-[1.02] ring-1 ring-yellow-400/30' : ''
                }`}
              >
                {isAnonymized ? 'A vote' : step.voterName}&apos;s vote... <span className="italic">Does Not Count</span>
              </div>
            )
          }

          return (
            <div
              key={index}
              className={`rounded-lg border px-4 py-2.5 text-sm transition-all duration-700 ${
                isCurrent
                  ? 'scale-[1.02] border-red-400/40 bg-red-500/10 text-white ring-1 ring-red-400/20'
                  : 'border-white/10 bg-white/[0.03] text-white/75'
              }`}
            >
              {isAnonymized ? (
                <span>Vote for <span className="font-semibold text-red-300">{step.targetName}</span></span>
              ) : (
                <span>
                  {step.voterName} voted for{' '}
                  <span className="font-semibold text-red-300">{step.targetName}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Elimination announcement */}
      {showElimination && eliminatedName && (
        <div className="animate-pulse rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-5 text-center">
          <div className="text-xs uppercase tracking-widest text-red-300/50">The tribe has spoken</div>
          <div className="mt-2 text-xl font-bold text-red-100">{eliminatedName}</div>
          <div className="mt-1 text-sm text-red-300/60">has been voted out</div>
        </div>
      )}
    </div>
  )
}
