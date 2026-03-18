'use client'

import { useState, useCallback, useEffect } from 'react'

export interface GuillotineChopAnimationProps {
  /** When true, play the animation once. */
  play: boolean
  /** Team/roster display name being chopped. */
  displayName?: string
  onComplete?: () => void
  /** Optional: reduce motion for low-performance. */
  reducedMotion?: boolean
  className?: string
}

/**
 * Premium guillotine-style chop animation. CSS-based for reliability; degrades gracefully.
 */
export function GuillotineChopAnimation({
  play,
  displayName,
  onComplete,
  reducedMotion = false,
  className = '',
}: GuillotineChopAnimationProps) {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'drop' | 'done'>('idle')

  const run = useCallback(() => {
    if (reducedMotion) {
      onComplete?.()
      return
    }
    setVisible(true)
    setPhase('drop')
    const t = setTimeout(() => {
      setPhase('done')
      const t2 = setTimeout(() => {
        setVisible(false)
        setPhase('idle')
        onComplete?.()
      }, 400)
      return () => clearTimeout(t2)
    }, 1200)
    return () => clearTimeout(t)
  }, [onComplete, reducedMotion])

  useEffect(() => {
    if (play) run()
  }, [play, run])

  if (!visible) return null

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/70 ${className}`}
      aria-hidden="true"
    >
      <div className="text-center">
        {displayName && (
          <p className="mb-4 text-lg font-semibold text-white drop-shadow-lg">
            {displayName}
          </p>
        )}
        <div
          className="relative mx-auto h-24 w-48 rounded-lg border-2 border-amber-700/80 bg-gradient-to-b from-amber-900/90 to-amber-950"
          style={{
            animation: phase === 'drop' && !reducedMotion ? 'guillotine-chop 1.2s ease-in forwards' : 'none',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-amber-200/90 text-sm font-medium">
            CHOPPED
          </div>
        </div>
        <p className="mt-4 text-sm text-white/80">Eliminated</p>
      </div>
    </div>
  )
}
