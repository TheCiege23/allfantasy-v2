'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Select, Input } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorSetupPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [players, setPlayers] = useState('18')
  const [tribes, setTribes] = useState('2')
  const [mergeWeek, setMergeWeek] = useState('7')
  const [draftType, setDraftType] = useState('snake')
  const [assign, setAssign] = useState('auto')
  const [juryStart, setJuryStart] = useState('post_merge')
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">
        Survivor league structure UI — persistence for these fields will follow when league PATCH exposes them.
      </p>
      <SettingsSection id="sv-structure" title="League structure" description="Season shell for the island game.">
        <SettingsRow
          label="Player count"
          description="Target cast size."
          control={
            <Select value={players} onChange={setPlayers} disabled={d}>
              {['16', '17', '18', '19', '20'].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          }
        />
        <SettingsRow
          label="Tribe count"
          control={
            <Select value={tribes} onChange={setTribes} disabled={d}>
              {['2', '3', '4', '5'].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          }
        />
        <SettingsRow
          label="Tribe size (auto)"
          description="Derived from players ÷ tribes."
          control={<span className="text-white/50">—</span>}
        />
      </SettingsSection>
      <SettingsSection id="sv-timing" title="Season timing">
        <SettingsRow
          label="Merge week"
          control={<Input type="number" value={mergeWeek} onChange={(e) => setMergeWeek(e.target.value)} disabled={d} className="w-24" />}
        />
        <SettingsRow
          label="Jury start"
          control={
            <Select value={juryStart} onChange={setJuryStart} disabled={d}>
              <option value="post_merge">Post-merge</option>
              <option value="post_merge_vote_1">After first merge tribal</option>
              <option value="player_count">At player count</option>
            </Select>
          }
        />
      </SettingsSection>
      <SettingsSection id="sv-draft" title="Draft & start">
        <SettingsRow
          label="Draft type"
          control={
            <Select value={draftType} onChange={setDraftType} disabled={d}>
              <option value="snake">Snake</option>
              <option value="auction">Auction</option>
              <option value="linear">Linear</option>
            </Select>
          }
        />
        <SettingsRow
          label="Post-draft tribe assignment"
          control={
            <Select value={assign} onChange={setAssign} disabled={d}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="pattern">Draft pattern</option>
            </Select>
          }
        />
      </SettingsSection>
    </div>
  )
}
