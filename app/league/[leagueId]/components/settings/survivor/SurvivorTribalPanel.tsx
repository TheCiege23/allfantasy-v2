'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorTribalPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [selfVote, setSelfVote] = useState(false)
  const [rocks, setRocks] = useState(true)
  const [reveal, setReveal] = useState('dramatic_sequential')
  const [pace, setPace] = useState('800')
  const [tie, setTie] = useState('revote_then_rocks')
  const [lateVote, setLateVote] = useState('dnc')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Tribal ceremony rules — reveal pacing is client-side only today.</p>
      <SettingsSection id="sv-vote-rules" title="Voting rules">
        <SettingsRow label="Self-vote allowed" control={<Toggle checked={selfVote} onChange={setSelfVote} disabled={d} />} />
        <SettingsRow label="Vote deadline (local)" control={<Input type="time" defaultValue="23:59" disabled={d} className="w-32" />} />
        <SettingsRow
          label="Late vote behavior"
          control={
            <Select value={lateVote} onChange={setLateVote} disabled={d}>
              <option value="dnc">Does not count</option>
              <option value="grace">30 min grace</option>
            </Select>
          }
        />
      </SettingsSection>
      <SettingsSection id="sv-reveal" title="Reveal mode">
        <SettingsRow
          label="Reveal mode"
          control={
            <Select value={reveal} onChange={setReveal} disabled={d}>
              <option value="dramatic_sequential">Dramatic sequential</option>
              <option value="full_public">Full public</option>
              <option value="anonymized">Anonymized</option>
              <option value="delayed">Delayed</option>
            </Select>
          }
        />
        <SettingsRow
          label="Reveal pacing (ms)"
          control={
            <Select value={pace} onChange={setPace} disabled={d}>
              <option value="500">Fast (500)</option>
              <option value="800">Normal (800)</option>
              <option value="1200">Slow (1200)</option>
            </Select>
          }
        />
      </SettingsSection>
      <SettingsSection id="sv-tie" title="Tie rules">
        <SettingsRow
          label="Tie resolution"
          control={
            <Select value={tie} onChange={setTie} disabled={d}>
              <option value="revote_then_rocks">Revote → rocks</option>
              <option value="fire_making">Fire making</option>
              <option value="commissioner">Commissioner</option>
              <option value="score">Score</option>
            </Select>
          }
        />
        <SettingsRow label="Go to rocks" control={<Toggle checked={rocks} onChange={setRocks} disabled={d} />} />
      </SettingsSection>
    </div>
  )
}
