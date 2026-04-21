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
 * Guillotine blade-drop animation. Plays a framed SVG with falling blade +
 * head silhouette tagged with the eliminated manager's username. CSS-only
 * so it works in any browser; reduced-motion skips the animation and
 * shows the final state.
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
      setVisible(true)
      setPhase('done')
      const t = setTimeout(() => {
        setVisible(false)
        setPhase('idle')
        onComplete?.()
      }, 900)
      return () => clearTimeout(t)
    }
    setVisible(true)
    setPhase('drop')
    const t = setTimeout(() => {
      setPhase('done')
      const t2 = setTimeout(() => {
        setVisible(false)
        setPhase('idle')
        onComplete?.()
      }, 800)
      return () => clearTimeout(t2)
    }, 1400)
    return () => clearTimeout(t)
  }, [onComplete, reducedMotion])

  useEffect(() => {
    if (play) run()
  }, [play, run])

  if (!visible) return null

  const bladeDropping = phase === 'drop' && !reducedMotion

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/80 ${className}`}
      aria-hidden="true"
      data-testid="guillotine-chop-animation"
    >
      <style>{`
        @keyframes gc-blade-drop {
          0% { transform: translateY(-180px); }
          70% { transform: translateY(150px); }
          85% { transform: translateY(135px); }
          100% { transform: translateY(150px); }
        }
        @keyframes gc-head-fall {
          0%, 60% { transform: translate(-50%, 0) rotate(0deg); opacity: 1; }
          75% { transform: translate(-50%, 40px) rotate(-18deg); opacity: 1; }
          100% { transform: translate(-50%, 220px) rotate(-90deg); opacity: 0; }
        }
        @keyframes gc-flash {
          0%, 65% { background-color: transparent; }
          70% { background-color: rgba(190, 18, 60, 0.35); }
          100% { background-color: transparent; }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{ animation: bladeDropping ? 'gc-flash 1.4s ease-out forwards' : 'none' }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative h-[360px] w-[280px]">
          {/* Frame uprights */}
          <div className="absolute left-[30px] top-0 h-full w-[16px] rounded-sm bg-gradient-to-b from-amber-900 via-amber-950 to-amber-900 shadow-[inset_-2px_0_0_rgba(0,0,0,0.4)]" />
          <div className="absolute right-[30px] top-0 h-full w-[16px] rounded-sm bg-gradient-to-b from-amber-900 via-amber-950 to-amber-900 shadow-[inset_2px_0_0_rgba(0,0,0,0.4)]" />
          {/* Top crossbeam */}
          <div className="absolute left-[24px] right-[24px] top-0 h-[18px] rounded-sm bg-gradient-to-b from-amber-800 to-amber-950 shadow-md" />
          {/* Bottom block */}
          <div className="absolute left-[10px] right-[10px] bottom-0 h-[40px] rounded-sm bg-gradient-to-b from-amber-900 to-amber-950 shadow-[0_4px_0_0_rgba(0,0,0,0.4)]" />
          {/* Lunette (neck hole) */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[32px] h-[18px] w-[90px] rounded-t-full border-2 border-amber-950/80 bg-black/60" />

          {/* Blade — drops from inside the frame */}
          <div
            className="absolute left-[46px] right-[46px] top-[18px] h-[90px]"
            style={{
              animation: bladeDropping
                ? 'gc-blade-drop 1.4s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards'
                : 'none',
              transform: reducedMotion ? 'translateY(150px)' : undefined,
            }}
          >
            {/* Blade body */}
            <div className="h-full w-full rounded-sm bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-600 shadow-[inset_-4px_0_0_rgba(0,0,0,0.25),0_4px_10px_rgba(0,0,0,0.6)]">
              {/* Blade edge — diagonal red stain */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[18px]"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(120,0,0,0.4) 60%, rgba(190,18,60,0.9) 100%)',
                  clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)',
                }}
              />
            </div>
          </div>

          {/* Head silhouette — sits in the lunette until blade hits, then falls */}
          <div
            className="absolute left-1/2 bottom-[36px] h-[28px] w-[28px] -translate-x-1/2 rounded-full bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-md"
            style={{
              animation: bladeDropping
                ? 'gc-head-fall 1.4s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards'
                : 'none',
              opacity: phase === 'done' ? 0 : 1,
            }}
          />
        </div>

        {displayName && (
          <div className="mt-6 flex items-center gap-3 rounded-full border border-rose-500/40 bg-rose-950/60 px-4 py-1.5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/90">
              Chopped
            </span>
            <span className="text-base font-bold text-white drop-shadow">@{displayName}</span>
          </div>
        )}
        <p className="mt-2 text-sm font-medium text-white/70">Eliminated from the league</p>
      </div>
    </div>
  )
}
