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

export function ReadOnlyRosterRow({
  def,
  count,
}: {
  def: SlotDef
  count: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <span className="w-[76px] text-left text-xs text-white/35">Read only</span>
      <span className="w-6 text-center font-mono text-sm text-white">{count}</span>
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${CATEGORY_DOT_CLASS[def.category] ?? 'bg-white/60'}`} />
        <span className="text-[12px] text-white/80">{def.label}</span>
      </div>
    </div>
  )
}
