'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorIdolsPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState('6')
  const [trade, setTrade] = useState(false)
  const [expireMerge, setExpireMerge] = useState(true)
  const [assign, setAssign] = useState('random')
  const [conversion, setConversion] = useState('faab')
  const [advancedPowers, setAdvancedPowers] = useState(false)
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Power pool checklist mirrors templates in DB when wired.</p>
      <SettingsSection id="sv-idol-sys" title="Idol system">
        <SettingsRow label="Idols enabled" control={<Toggle checked={enabled} onChange={setEnabled} disabled={d} />} />
        <SettingsRow
          label="Idol count"
          control={<Input type="number" value={count} onChange={(e) => setCount(e.target.value)} disabled={d} className="w-20" />}
        />
      </SettingsSection>
      <SettingsSection id="sv-power-pool" title="Power pool">
        <SettingsRow
          label="Core powers"
          description="Hidden immunity, vote steal, etc."
          control={<span className="text-white/45">12 selected (preview)</span>}
        />
        <SettingsRow label="Advanced powers" control={<Toggle checked={advancedPowers} onChange={setAdvancedPowers} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-idol-rules" title="Idol rules">
        <SettingsRow label="Tradable" control={<Toggle checked={trade} onChange={setTrade} disabled={d} />} />
        <SettingsRow label="Expire at merge" control={<Toggle checked={expireMerge} onChange={setExpireMerge} disabled={d} />} />
        <SettingsRow
          label="Conversion rule"
          control={
            <Select value={conversion} onChange={setConversion} disabled={d}>
              <option value="faab">FAAB</option>
              <option value="points">Points</option>
              <option value="none">None</option>
            </Select>
          }
        />
        <SettingsRow
          label="Assignment mode"
          control={
            <Select value={assign} onChange={setAssign} disabled={d}>
              <option value="random">Random</option>
              <option value="weighted">Weighted</option>
              <option value="manual">Manual</option>
            </Select>
          }
        />
      </SettingsSection>
    </div>
  )
}
