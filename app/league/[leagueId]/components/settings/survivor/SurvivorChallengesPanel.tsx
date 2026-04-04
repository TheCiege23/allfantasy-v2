'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorChallengesPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [mode, setMode] = useState('full_auto')
  const [lockKickoff, setLockKickoff] = useState(true)
  const [submit, setSubmit] = useState('both')
  const [sportGen, setSportGen] = useState('league')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Challenge automation UI — engine handles grading separately.</p>
      <SettingsSection id="sv-ch-auto" title="Challenge automation">
        <SettingsRow
          label="Challenge mode"
          control={
            <Select value={mode} onChange={setMode} disabled={d}>
              <option value="full_auto">Fully auto</option>
              <option value="semi">Semi-auto (approval)</option>
              <option value="manual">Manual</option>
            </Select>
          }
        />
        <SettingsRow
          label="Auto-generate for sport"
          control={
            <Select value={sportGen} onChange={setSportGen} disabled={d}>
              <option value="league">Same as league sport</option>
            </Select>
          }
        />
      </SettingsSection>
      <SettingsSection id="sv-ch-time" title="Challenge timing">
        <SettingsRow label="Lock at kickoff" control={<Toggle checked={lockKickoff} onChange={setLockKickoff} disabled={d} />} />
        <SettingsRow
          label="Submission method"
          control={
            <Select value={submit} onChange={setSubmit} disabled={d}>
              <option value="tribe_chat">Tribe chat</option>
              <option value="private_chimmy">Private @Chimmy</option>
              <option value="both">Both</option>
            </Select>
          }
        />
      </SettingsSection>
    </div>
  )
}
