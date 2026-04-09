'use client'

import { useEffect, useState } from 'react'

interface MergeSplashScreenProps {
  tribeName: string
  tribeColor?: string
  playerNames: string[]
  expiredPowers: number
  juryStarts: boolean
  onDismiss: () => void
}

export function MergeSplashScreen({
  tribeName,
  tribeColor,
  playerNames,
  expiredPowers,
  juryStarts,
  onDismiss,
}: MergeSplashScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'players' | 'rules' | 'ready'>('intro')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('players'), 3000),
      setTimeout(() => setPhase('rules'), 6000),
      setTimeout(() => setPhase('ready'), 9000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="max-w-lg w-full mx-4 text-center space-y-6">
        {/* Tribe name reveal */}
        <div className={`transition-all duration-1000 ${phase === 'intro' ? 'scale-110 opacity-100' : 'scale-100 opacity-80'}`}>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-300/60 mb-2">The Tribes Have Merged</div>
          <div
            className="text-4xl font-bold tracking-wide"
            style={{ color: tribeColor ?? '#f59e0b' }}
          >
            {tribeName}
          </div>
        </div>

        {/* Players */}
        {(phase === 'players' || phase === 'rules' || phase === 'ready') && (
          <div className="transition-all duration-700 opacity-100">
            <div className="text-xs uppercase tracking-wide text-white/40 mb-3">{playerNames.length} Survivors Remain</div>
            <div className="flex flex-wrap justify-center gap-2">
              {playerNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rules update */}
        {(phase === 'rules' || phase === 'ready') && (
          <div className="space-y-2 transition-all duration-700">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 text-left space-y-1.5">
              <div>Individual immunity begins.</div>
              <div>Highest weekly scorer wins immunity each week.</div>
              {expiredPowers > 0 && (
                <div className="text-amber-300/80">{expiredPowers} pre-merge power(s) have expired.</div>
              )}
              {juryStarts && (
                <div className="text-purple-300/80">Jury phase begins now. Eliminated players join the jury.</div>
              )}
            </div>
          </div>
        )}

        {/* Dismiss */}
        {phase === 'ready' && (
          <button
            onClick={onDismiss}
            className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-8 py-3 text-sm font-medium text-amber-100 hover:bg-amber-400/20 transition"
          >
            Enter the Merged Island
          </button>
        )}
      </div>
    </div>
  )
}
