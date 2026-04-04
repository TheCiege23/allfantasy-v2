'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/components/settings/ui'

export function IDPRosterPanel() {
  const [mode, setMode] = useState<'standard' | 'advanced' | 'custom'>('standard')
  const [dl, setDl] = useState(2)
  const [lb, setLb] = useState(2)
  const [db, setDb] = useState(2)
  const [flex, setFlex] = useState(1)
  const [bench, setBench] = useState(3)

  return (
    <div className="pb-8">
      <SettingsSection title="Defensive slots" description="UI preview — roster changes go through your IDP config flow.">
        <SettingsRow label="Position mode">
          <div className="flex flex-wrap gap-2">
            {(['standard', 'advanced', 'custom'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize ${
                  mode === m ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-100' : 'border-white/10 text-white/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </SettingsRow>

        {mode === 'standard' ? (
          <>
            <SettingsRow label="DL slots">
              <input
                type="number"
                min={0}
                max={4}
                value={dl}
                onChange={(e) => setDl(Math.min(4, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </SettingsRow>
            <SettingsRow label="LB slots">
              <input
                type="number"
                min={0}
                max={4}
                value={lb}
                onChange={(e) => setLb(Math.min(4, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </SettingsRow>
            <SettingsRow label="DB slots">
              <input
                type="number"
                min={0}
                max={4}
                value={db}
                onChange={(e) => setDb(Math.min(4, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </SettingsRow>
            <SettingsRow label="IDP flex slots">
              <input
                type="number"
                min={0}
                max={3}
                value={flex}
                onChange={(e) => setFlex(Math.min(3, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </SettingsRow>
            <SettingsRow label="Defensive bench">
              <input
                type="number"
                min={0}
                max={6}
                value={bench}
                onChange={(e) => setBench(Math.min(6, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </SettingsRow>
          </>
        ) : (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] text-white/45">
            Advanced: DE / DT / CB / S slot counts mirror commissioner IDP tools elsewhere.
          </p>
        )}
      </SettingsSection>
    </div>
  )
}
