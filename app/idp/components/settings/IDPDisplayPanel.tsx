'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/components/settings/ui'

export function IDPDisplayPanel() {
  const [view, setView] = useState<'combined' | 'offense' | 'defense'>('combined')
  const [snap, setSnap] = useState(true)
  const [role, setRole] = useState(true)
  const [pills, setPills] = useState(true)
  const [tiers, setTiers] = useState(true)

  return (
    <div className="pb-8">
      <SettingsSection title="Default view">
        <SettingsRow label="Team dashboard">
          <div className="flex flex-wrap gap-2">
            {(['combined', 'offense', 'defense'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize ${
                  view === v ? 'border-violet-500/50 bg-violet-950/40 text-violet-100' : 'border-white/10 text-white/50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Show snap share on cards">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
        </SettingsRow>
        <SettingsRow label="Show role label">
          <input type="checkbox" checked={role} onChange={(e) => setRole(e.target.checked)} />
        </SettingsRow>
        <SettingsRow label="Show stat pills">
          <input type="checkbox" checked={pills} onChange={(e) => setPills(e.target.checked)} />
        </SettingsRow>
        <SettingsRow label="Draft tier color coding">
          <input type="checkbox" checked={tiers} onChange={(e) => setTiers(e.target.checked)} />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
