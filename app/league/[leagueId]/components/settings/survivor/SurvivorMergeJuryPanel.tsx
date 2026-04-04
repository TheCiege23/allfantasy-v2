'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorMergeJuryPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [mergeChat, setMergeChat] = useState(true)
  const [preMergeExpire, setPreMergeExpire] = useState(true)
  const [finalThree, setFinalThree] = useState(true)
  const [juryStart, setJuryStart] = useState('post_merge')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Merge & jury cadence — finale timers are display-only until persisted.</p>
      <SettingsSection id="sv-merge" title="Merge">
        <SettingsRow label="Merge week" control={<Input type="number" defaultValue={7} disabled={d} className="w-20" />} />
        <SettingsRow label="Merge tribe name" control={<Input placeholder="Auto or custom" disabled={d} />} />
        <SettingsRow label="Auto-create merge chat" control={<Toggle checked={mergeChat} onChange={setMergeChat} disabled={d} />} />
        <SettingsRow label="Pre-merge idol expiration" control={<Toggle checked={preMergeExpire} onChange={setPreMergeExpire} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-jury" title="Jury">
        <SettingsRow
          label="Jury start"
          control={
            <Select value={juryStart} onChange={setJuryStart} disabled={d}>
              <option value="post_merge">Post-merge</option>
              <option value="vote_1">After first merge vote</option>
              <option value="count">At player count</option>
            </Select>
          }
        />
        <SettingsRow label="Final 3 (vs Final 2)" control={<Toggle checked={finalThree} onChange={setFinalThree} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-finale" title="Finale">
        <SettingsRow
          label="Jury Q&A window (hours)"
          control={<Input type="number" defaultValue={48} disabled={d} className="w-20" />}
        />
        <SettingsRow
          label="Jury vote deadline (hours after Q&A)"
          control={<Input type="number" defaultValue={24} disabled={d} className="w-20" />}
        />
      </SettingsSection>
    </div>
  )
}
