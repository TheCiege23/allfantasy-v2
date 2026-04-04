'use client'

import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CDevyPanel({ config }: { config: C2CConfigClient | null }) {
  if (!config) return <p className="px-6 py-8 text-[13px] text-white/45">Loading…</p>

  return (
    <div className="space-y-4 px-6 py-6 text-[13px] text-white/80" data-testid="c2c-devy-panel">
      <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-[12px] text-violet-100/90">
        Devy scoring: {config.devyScoringEnabled ? 'Campus slots eligible' : 'Stash only (default)'}
      </div>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="radio" name="devysc" checked={!config.devyScoringEnabled} readOnly />
        Stash only
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="radio" name="devysc" checked={!!config.devyScoringEnabled} readOnly />
        Campus scoring eligible
      </label>
      <label className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <span className="text-white/60">Freshman eligible</span>
        <input type="checkbox" disabled className="accent-violet-500" />
      </label>
      <label className="block">
        <span className="text-[11px] text-white/45">Max devy per team</span>
        <input type="number" defaultValue={6} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2" disabled />
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" disabled />
        Declaration year display
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" disabled />
        Auto-graduate to pro pipeline
      </label>
    </div>
  )
}
