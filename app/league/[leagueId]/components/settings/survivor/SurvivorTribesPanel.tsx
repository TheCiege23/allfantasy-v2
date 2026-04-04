'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorTribesPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [naming, setNaming] = useState('auto')
  const [swap, setSwap] = useState(false)
  const [rebalance, setRebalance] = useState(true)
  const [swapType, setSwapType] = useState('random')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Tribe identity and swap rules — UI only until API wiring lands.</p>
      <SettingsSection id="sv-tribe-names" title="Tribe names & logos">
        <SettingsRow
          label="Naming mode"
          control={
            <Select value={naming} onChange={setNaming} disabled={d}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="ai">AI-generated</option>
            </Select>
          }
        />
        <SettingsRow label="Manage tribes" description="Open tribe editor when manual." control={<Input placeholder="Tribe list" disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-rebalance" title="Rebalancing">
        <SettingsRow label="Auto-rebalance" control={<Toggle checked={rebalance} onChange={setRebalance} disabled={d} />} />
        <SettingsRow
          label="Min tribe size before rebalance"
          control={<Input type="number" defaultValue={4} disabled={d} className="w-20" />}
        />
      </SettingsSection>
      <SettingsSection id="sv-swap" title="Tribe swaps">
        <SettingsRow label="Swap enabled" control={<Toggle checked={swap} onChange={setSwap} disabled={d} />} />
        <SettingsRow label="Swap week" control={<Input type="number" defaultValue={4} disabled={d} className="w-20" />} />
        <SettingsRow
          label="Swap type"
          control={
            <Select value={swapType} onChange={setSwapType} disabled={d}>
              <option value="random">Random</option>
              <option value="schoolyard">Schoolyard pick</option>
              <option value="commissioner">Commissioner</option>
            </Select>
          }
        />
      </SettingsSection>
    </div>
  )
}
