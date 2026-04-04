'use client'

import { c2cScoreModeDescription, type C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CScoreSummaryBar({
  campus,
  canton,
  total,
  config,
  compact,
}: {
  campus: number
  canton: number
  total: number
  config: C2CConfigClient
  compact?: boolean
}) {
  const sum = Math.max(campus + canton, 0.0001)
  const campusPct = campus / sum
  const cantonPct = canton / sum
  const desc = c2cScoreModeDescription(config)

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[color:var(--c2c-panel)] p-3 ${compact ? 'max-w-full' : ''}`}
      data-testid="c2c-score-summary-bar"
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/90">🎓 Campus</p>
          <p className="text-lg font-bold text-violet-200" style={{ textShadow: 'var(--c2c-campus-glow)' }}>
            {campus.toFixed(1)}
          </p>
          <p className="text-[9px] text-white/40">pts</p>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase text-white/50">Total</p>
          <p className="text-xl font-extrabold text-white">{total.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-300/90">🏙 Canton</p>
          <p className="text-lg font-bold text-blue-200" style={{ textShadow: 'var(--c2c-canton-glow)' }}>
            {canton.toFixed(1)}
          </p>
          <p className="text-[9px] text-white/40">pts</p>
        </div>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full bg-violet-600/80 transition-[width] duration-300"
          style={{ width: `${Math.round(campusPct * 100)}%` }}
          aria-hidden
        />
        <div
          className="h-full bg-blue-600/80 transition-[width] duration-300"
          style={{ width: `${Math.round(cantonPct * 100)}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-center text-[10px] text-white/45">{desc}</p>
    </div>
  )
}
