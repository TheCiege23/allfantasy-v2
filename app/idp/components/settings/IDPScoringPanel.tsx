'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/components/settings/ui'

function NumInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-md border border-white/15 px-2 py-1 text-white/60"
        onClick={() => onChange(Math.max(0, value - 0.5))}
      >
        −
      </button>
      <input
        type="number"
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
      />
      <button
        type="button"
        className="rounded-md border border-white/15 px-2 py-1 text-white/60"
        onClick={() => onChange(value + 0.5)}
      >
        +
      </button>
    </div>
  )
}

export function IDPScoringPanel() {
  const [solo, setSolo] = useState(1)
  const [ast, setAst] = useState(0.5)
  const [sack, setSack] = useState(2)
  const [intc, setIntc] = useState(6)
  const [tfl, setTfl] = useState(false)

  return (
    <div className="pb-8">
      <SettingsSection title="Core scoring" description="Values shown for layout review; live scoring uses league config.">
        <SettingsRow label="Solo tackle">
          <NumInput value={solo} onChange={setSolo} />
        </SettingsRow>
        <SettingsRow label="Assisted tackle">
          <NumInput value={ast} onChange={setAst} />
        </SettingsRow>
        <SettingsRow label="Sack">
          <NumInput value={sack} onChange={setSack} />
        </SettingsRow>
        <SettingsRow label="Interception">
          <NumInput value={intc} onChange={setIntc} />
        </SettingsRow>
        <SettingsRow label="Defensive TD">
          <span className="text-sm text-white/50">6 (fixed)</span>
        </SettingsRow>
        <SettingsRow label="Safety">
          <span className="text-sm text-white/50">2 (fixed)</span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Advanced scoring">
        <SettingsRow label="Tackle for loss">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={tfl} onChange={(e) => setTfl(e.target.checked)} />
            Enable + bonus
          </label>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
