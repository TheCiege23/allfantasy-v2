'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { WeightedLotteryResult } from '@/lib/draft-lottery/types'

type Props = {
  result: WeightedLotteryResult
  onClose: () => void
}

function oddsForRoster(result: WeightedLotteryResult, rosterId: string): number | null {
  const row = result.oddsSnapshot?.find((o) => o.rosterId === rosterId)
  return row ? row.oddsPercent : null
}

export function LotteryReveal({ result, onClose }: Props) {
  const [mode, setMode] = useState<'sequential' | 'all'>('sequential')
  const [step, setStep] = useState(0)
  const [faceUp, setFaceUp] = useState(false)

  const lotteryPicks = result.lotteryDraws
  const runAt = useMemo(() => {
    try {
      return new Date(result.runAt).toLocaleString()
    } catch {
      return result.runAt
    }
  }, [result.runAt])

  const showFullOrderTable = mode === 'all' || step >= lotteryPicks.length

  const goNextPick = () => {
    setFaceUp(false)
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a1228] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lottery-reveal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/[0.06] px-5 pb-4 pt-5 pr-12">
          <h2 id="lottery-reveal-title" className="text-lg font-bold text-white">
            🎱 Rookie Draft Order Set
          </h2>
          <p className="mt-1 text-xs text-white/50">Weighted Lottery Results — {runAt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('sequential')
                setStep(0)
                setFaceUp(false)
              }}
              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                mode === 'sequential' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.06] text-white/60'
              }`}
            >
              Reveal one by one
            </button>
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                mode === 'all' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.06] text-white/60'
              }`}
            >
              Show all
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          {mode === 'sequential' && !allRevealed && lotteryPicks[step] && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Pick {lotteryPicks[step].pickSlot}
              </p>
              <div className="w-full max-w-sm [perspective:1000px]">
                <button
                  type="button"
                  onClick={() => (faceUp ? goNextPick() : setFaceUp(true))}
                  className="relative h-40 w-full text-left outline-none"
                  aria-label={faceUp ? 'Next pick' : 'Reveal pick'}
                >
                  <div
                    className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                    style={{ transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                  >
                    <div className="absolute inset-0 flex h-full w-full items-center justify-center rounded-xl border border-orange-500/40 bg-gradient-to-br from-orange-900/40 to-amber-950/50 [backface-visibility:hidden]">
                      <span className="text-lg font-bold text-orange-200/90">🔵 Tap to reveal</span>
                    </div>
                    <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-[#0f1521] p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                      <p className="text-center text-base font-bold text-white">{lotteryPicks[step].displayName}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {oddsForRoster(result, lotteryPicks[step].rosterId) != null
                          ? `${oddsForRoster(result, lotteryPicks[step].rosterId)!.toFixed(1)}% odds (pre-draw)`
                          : ''}
                      </p>
                      <p className="mt-3 text-xs text-cyan-300/90">Tap again for next pick</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {showFullOrderTable && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Lottery picks
                </p>
                <div className="rounded-lg border border-white/[0.08] overflow-hidden">
                  <ul className="divide-y divide-white/[0.06]">
                    {lotteryPicks.map((d, i) => (
                      <li
                        key={`${d.rosterId}-${d.pickSlot}`}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          i === 0 ? 'bg-cyan-500/10' : 'bg-white/[0.02]'
                        }`}
                      >
                        <span className="font-medium text-white/90">
                          #{d.pickSlot} {d.displayName}
                        </span>
                        <span className="text-xs text-white/55">
                          {oddsForRoster(result, d.rosterId) != null
                            ? `(${oddsForRoster(result, d.rosterId)!.toFixed(1)}%)`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.fallbackOrder.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    Remaining order (after lottery)
                  </p>
                  <div className="rounded-lg border border-white/[0.08] overflow-hidden">
                    <ul className="divide-y divide-white/[0.06]">
                      {result.fallbackOrder.map((row) => (
                        <li
                          key={`${row.rosterId}-${row.slot}`}
                          className="flex items-center justify-between bg-white/[0.02] px-3 py-2 text-sm"
                        >
                          <span className="text-white/85">
                            #{row.slot} {row.displayName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-xs text-white/45">
                Playoff teams follow in reverse playoff finish where applicable (see league rules).
              </p>
            </div>
          )}

          <p className="break-all text-[11px] text-white/35">
            Lottery seed: {result.seed.length > 20 ? `${result.seed.slice(0, 20)}…` : result.seed} · Auditable &
            reproducible
          </p>
        </div>
      </div>
    </div>
  )
}
