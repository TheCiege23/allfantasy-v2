'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorChatPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [tribeChat, setTribeChat] = useState(true)
  const [mergeChat, setMergeChat] = useState(true)
  const [exileChat, setExileChat] = useState(true)
  const [juryChat, setJuryChat] = useState(true)
  const [alliances, setAlliances] = useState(false)
  const [elimNoTribe, setElimNoTribe] = useState(true)
  const [exileReadMain, setExileReadMain] = useState(false)
  const [reunion, setReunion] = useState(true)
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Chat permissions align with survivor engine access flags when synced.</p>
      <SettingsSection id="sv-chat-create" title="Chat permissions">
        <SettingsRow label="Tribe chats auto-created" control={<Toggle checked={tribeChat} onChange={setTribeChat} disabled={d} />} />
        <SettingsRow label="Merge chat auto-created" control={<Toggle checked={mergeChat} onChange={setMergeChat} disabled={d} />} />
        <SettingsRow label="Exile chat auto-created" control={<Toggle checked={exileChat} onChange={setExileChat} disabled={d} />} />
        <SettingsRow label="Jury chat auto-created" control={<Toggle checked={juryChat} onChange={setJuryChat} disabled={d} />} />
        <SettingsRow label="Alliance chats allowed" control={<Toggle checked={alliances} onChange={setAlliances} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-chat-rules" title="Chat access rules">
        <SettingsRow
          label="Eliminated lose tribe chat input"
          control={<Toggle checked={elimNoTribe} onChange={setElimNoTribe} disabled={d} />}
        />
        <SettingsRow
          label="Exile can read main island history"
          control={<Toggle checked={exileReadMain} onChange={setExileReadMain} disabled={d} />}
        />
        <SettingsRow label="Post-season full chat access" control={<Toggle checked={reunion} onChange={setReunion} disabled={d} />} />
      </SettingsSection>
    </div>
  )
}
