import { Minus, Plus } from 'lucide-react'
import type { SlotDef } from './types'

const CATEGORY_DOT_CLASS: Record<string, string> = {
  offense: 'bg-cyan-400',
  flex: 'bg-fuchsia-400',
  kicker: 'bg-zinc-400',
  dst: 'bg-slate-400',
  idp: 'bg-emerald-400',
  bench: 'bg-zinc-500',
  reserve: 'bg-rose-400',
  college: 'bg-violet-400',
}

export function RosterRowControl({
  def,
  count,
  disabled,
  onAdjust,
}: {
  def: SlotDef
  count: number
  disabled?: boolean
  onAdjust: (key: string, delta: number) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
      <button
        type="button"
        title={`Decrease ${def.label}`}
        aria-label={`Decrease ${def.label}`}
        disabled={disabled || count <= def.minCount}
        onClick={() => onAdjust(def.key, -1)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <span className="w-6 text-center font-mono text-sm text-white">{count}</span>

      <button
        type="button"
        title={`Increase ${def.label}`}
        aria-label={`Increase ${def.label}`}
        disabled={disabled || count >= def.maxCount}
        onClick={() => onAdjust(def.key, 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${CATEGORY_DOT_CLASS[def.category] ?? 'bg-white/60'}`} />
        <span className="text-[12px] text-white/80">{def.label}</span>
      </div>
    </div>
  )
}
