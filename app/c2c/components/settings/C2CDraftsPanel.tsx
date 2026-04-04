'use client'

import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CDraftsPanel({ config }: { config: C2CConfigClient | null }) {
  if (!config) return <p className="px-6 py-8 text-[13px] text-white/45">Loading…</p>

  return (
    <div className="space-y-4 px-6 py-6 text-[13px] text-white/80" data-testid="c2c-drafts-panel">
      <div>
        <p className="text-[11px] font-bold uppercase text-white/45">Startup format</p>
        <p className="mt-1 rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-[12px] text-white/65">
          {config.startupDraftFormat ?? 'split_campus_canton'}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase text-white/45">Future format</p>
        <p className="mt-1 rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-[12px] text-white/65">
          {config.futureDraftFormat ?? 'combined'}
        </p>
      </div>
      <label className="block">
        <span className="text-[11px] text-white/45">Clock (sec / side)</span>
        <input type="number" defaultValue={90} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2" disabled />
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" defaultChecked disabled />
        Pick trading (campus + canton)
      </label>
    </div>
  )
}
