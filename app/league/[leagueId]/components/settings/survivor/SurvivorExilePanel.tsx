'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorExilePanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [exile, setExile] = useState(true)
  const [tokens, setTokens] = useState(true)
  const [boss, setBoss] = useState(false)
  const [bossResetOnWin, setBossResetOnWin] = useState(true)
  const [bossScoring, setBossScoring] = useState('auto')
  const [returnTrigger, setReturnTrigger] = useState('token_leader')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Exile island economy — token math stays server-authoritative.</p>
      <SettingsSection id="sv-exile-sys" title="Exile system">
        <SettingsRow label="Exile enabled" control={<Toggle checked={exile} onChange={setExile} disabled={d} />} />
        <SettingsRow label="Token pool enabled" control={<Toggle checked={tokens} onChange={setTokens} disabled={d} />} />
        <SettingsRow label="Boss reset" control={<Toggle checked={boss} onChange={setBoss} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-return" title="Return rules">
        <SettingsRow
          label="Return trigger"
          control={
            <Select value={returnTrigger} onChange={setReturnTrigger} disabled={d}>
              <option value="manual">Manual</option>
              <option value="token_leader">Token leader</option>
              <option value="week">Set week</option>
              <option value="commissioner">Commissioner</option>
            </Select>
          }
        />
        <SettingsRow label="Return week" control={<Input type="number" defaultValue={9} disabled={d} className="w-20" />} />
        <SettingsRow label="Token → FAAB rate" control={<Input placeholder="e.g. 5" disabled={d} className="w-24" />} />
      </SettingsSection>
      <SettingsSection id="sv-boss" title="Boss configuration">
        <SettingsRow label="Boss name" control={<Input placeholder="The Island" disabled={d} />} />
        <SettingsRow
          label="Boss scoring"
          control={
            <Select value={bossScoring} onChange={setBossScoring} disabled={d}>
              <option value="auto">Auto</option>
              <option value="lineup">Commissioner lineup</option>
            </Select>
          }
        />
        <SettingsRow
          label="Boss reset on win"
          control={<Toggle checked={bossResetOnWin} onChange={setBossResetOnWin} disabled={d} />}
        />
      </SettingsSection>
    </div>
  )
}
