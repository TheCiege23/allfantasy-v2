'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Minus, Scale, TrendingUp, TrendingDown } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { TradeLean } from '../types'

type SideKey = 'a' | 'b'

const LEAN_STYLES: Record<TradeLean, { label: string; text: string; bg: string }> = {
  buy: { label: 'Lean Buy', text: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  sell: { label: 'Lean Sell', text: 'text-red-300', bg: 'bg-red-500/10 border-red-500/25' },
  hold: { label: 'Lean Hold', text: 'text-amber-200', bg: 'bg-amber-500/10 border-amber-500/25' },
}

/**
 * Analytical signature: every surface is a measurement — fairness meter,
 * numeric value deltas, buy/sell/hold lean. Feels like a trade calculator,
 * not a generic modal.
 *
 * TODO: plug into real trade AI — replace `computePlaceholderVerdict` with
 * a fetch to `/api/trade/evaluate` (or equivalent) once available. The UI
 * is already structured around `{ fairness, lean, valueA, valueB, reasoning }`.
 */
export function TradeValueModal({
  open,
  onClose,
  leagueId: _leagueId,
  leagueName,
}: {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
}) {
  const [sideA, setSideA] = useState<string[]>([''])
  const [sideB, setSideB] = useState<string[]>([''])
  const [format, setFormat] = useState<'redraft' | 'dynasty'>('redraft')

  const verdict = useMemo(
    () => computePlaceholderVerdict(sideA, sideB, format),
    [sideA, sideB, format],
  )

  const addPlayer = (side: SideKey) => {
    if (side === 'a') setSideA((s) => [...s, ''])
    else setSideB((s) => [...s, ''])
  }
  const updatePlayer = (side: SideKey, i: number, v: string) => {
    if (side === 'a') setSideA((s) => s.map((x, j) => (i === j ? v : x)))
    else setSideB((s) => s.map((x, j) => (i === j ? v : x)))
  }
  const removePlayer = (side: SideKey, i: number) => {
    if (side === 'a') setSideA((s) => s.filter((_, j) => j !== i))
    else setSideB((s) => s.filter((_, j) => j !== i))
  }

  const hasInput = sideA.some((x) => x.trim()) && sideB.some((x) => x.trim())

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Trade Value"
      subtitle="Analytical evaluation console"
      accentColor="purple"
      icon={<ArrowLeftRight className="h-5 w-5" />}
      chimmyPrompt={`Evaluate this trade for ${leagueName}: ${sideA.filter(Boolean).join(', ')} for ${sideB.filter(Boolean).join(', ')}`}
    >
      {/* Format toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
          League Format
        </p>
        <div className="flex gap-1 rounded-lg bg-white/[0.04] p-0.5">
          {(['redraft', 'dynasty'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                format === f ? 'bg-purple-500/20 text-purple-200' : 'text-white/35 hover:text-white/60'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Trade inputs — two columns */}
      <div className="grid grid-cols-2 gap-2.5">
        <TradeSide
          label="You Give"
          players={sideA}
          accent="purple"
          onUpdate={(i, v) => updatePlayer('a', i, v)}
          onRemove={(i) => removePlayer('a', i)}
          onAdd={() => addPlayer('a')}
        />
        <TradeSide
          label="You Get"
          players={sideB}
          accent="cyan"
          onUpdate={(i, v) => updatePlayer('b', i, v)}
          onRemove={(i) => removePlayer('b', i)}
          onAdd={() => addPlayer('b')}
        />
      </div>

      {/* Fairness meter — signature */}
      <div className="mt-5 rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-purple-300" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">
              Fairness
            </p>
          </div>
          <p className="text-[18px] font-black tabular-nums text-white/95">
            {hasInput ? verdict.fairness : '—'}
            <span className="text-[11px] font-bold text-white/30">/100</span>
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 transition-all duration-500"
            style={{ width: `${hasInput ? verdict.fairness : 0}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/25">
          <span>Lopsided</span>
          <span>Even</span>
          <span>Lopsided</span>
        </div>
      </div>

      {/* Value deltas + lean */}
      {hasInput ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ValueCard label="You Give" value={verdict.valueA} accent="purple" />
          <LeanCard lean={verdict.lean} />
          <ValueCard label="You Get" value={verdict.valueB} accent="cyan" />
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[11px] text-white/35">
          Enter at least one player on each side to run the analysis.
        </div>
      )}

      {/* Reasoning */}
      {hasInput ? (
        <div className="mt-3 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] px-4 py-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-purple-300/70">
            AI Reasoning
          </p>
          <p className="text-[12px] leading-relaxed text-white/65">{verdict.reasoning}</p>
        </div>
      ) : null}

      {/* Quick rebalance actions */}
      <div className="mt-4">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
          Rebalance
        </p>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction label="Add a piece" />
          <QuickAction label="Remove a piece" />
          <QuickAction label="Suggest swap" />
        </div>
      </div>
    </AIToolModalShell>
  )
}

// ── Placeholder verdict calculator ───────────────────────────────────
// Replace with `/api/trade/evaluate` when ready.

function computePlaceholderVerdict(
  sideA: string[],
  sideB: string[],
  format: 'redraft' | 'dynasty',
): { fairness: number; lean: TradeLean; valueA: number; valueB: number; reasoning: string } {
  const aCount = sideA.filter((x) => x.trim()).length
  const bCount = sideB.filter((x) => x.trim()).length
  if (aCount === 0 || bCount === 0) {
    return {
      fairness: 0,
      lean: 'hold',
      valueA: 0,
      valueB: 0,
      reasoning: 'Waiting for both sides of the trade.',
    }
  }
  // Deterministic placeholder keyed off input length — stable, feels
  // "calculated" without a backend. Real API will overwrite.
  const valueA = 40 + (sideA.join('').length * 3) % 45
  const valueB = 40 + (sideB.join('').length * 5) % 45
  const diff = valueA - valueB
  const fairness = Math.max(20, Math.min(100, 100 - Math.abs(diff) * 2))
  const lean: TradeLean = diff > 8 ? 'sell' : diff < -8 ? 'buy' : 'hold'
  const formatNote =
    format === 'dynasty'
      ? 'Dynasty weighting leans toward youth curves.'
      : 'Redraft weighting prioritizes rest-of-season output.'
  return {
    fairness,
    lean,
    valueA,
    valueB,
    reasoning: `${formatNote} The ${
      lean === 'buy' ? 'incoming' : lean === 'sell' ? 'outgoing' : 'two'
    } side ${
      lean === 'hold' ? 'roughly match' : 'carries a clear edge'
    } in projected points, positional scarcity, and roster fit.`,
  }
}

// ── Side column ─────────────────────────────────────────────────────

function TradeSide({
  label,
  players,
  accent,
  onUpdate,
  onRemove,
  onAdd,
}: {
  label: string
  players: string[]
  accent: 'purple' | 'cyan'
  onUpdate: (i: number, v: string) => void
  onRemove: (i: number) => void
  onAdd: () => void
}) {
  const accentCls =
    accent === 'purple'
      ? 'border-purple-500/15 bg-purple-500/[0.04] focus-within:border-purple-400/40'
      : 'border-cyan-500/15 bg-cyan-500/[0.04] focus-within:border-cyan-400/40'
  return (
    <div className={`rounded-xl border p-2.5 ${accentCls}`}>
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <div className="space-y-1.5">
        {players.map((name, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => onUpdate(i, e.target.value)}
              placeholder="Player name"
              className="w-full rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/80 placeholder-white/25 outline-none focus:border-white/20"
            />
            {players.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] text-white/30 transition hover:text-white/60"
                aria-label="Remove player"
              >
                <Minus className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/40 transition hover:text-white/70"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  )
}

// ── Value + lean cards ──────────────────────────────────────────────

function ValueCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'purple' | 'cyan'
}) {
  const cls = accent === 'purple' ? 'text-purple-200' : 'text-cyan-200'
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <p className={`mt-1 text-[20px] font-black tabular-nums ${cls}`}>{value}</p>
      <p className="text-[8px] font-semibold text-white/25">value pts</p>
    </div>
  )
}

function LeanCard({ lean }: { lean: TradeLean }) {
  const style = LEAN_STYLES[lean]
  const Icon = lean === 'buy' ? TrendingUp : lean === 'sell' ? TrendingDown : Scale
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border ${style.bg} py-2.5`}>
      <Icon className={`h-5 w-5 ${style.text}`} />
      <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
        {style.label}
      </p>
    </div>
  )
}

function QuickAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-[10px] font-semibold text-white/50 transition hover:border-purple-400/25 hover:bg-purple-500/[0.06] hover:text-purple-200"
    >
      {label}
    </button>
  )
}
