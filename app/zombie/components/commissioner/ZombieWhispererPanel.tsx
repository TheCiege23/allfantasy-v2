'use client'

import { SettingsSection, SettingsRow, Select } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieWhispererPanel({ canEdit }: { canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-whisperer" title="Whisperer selection">
        <SettingsRow
          label="Selection mode"
          control={
            <Select value="random" onChange={() => {}} disabled={d}>
              <option value="random">Random</option>
              <option value="veteran_priority">Veteran priority</option>
              <option value="manual">Manual</option>
            </Select>
          }
        />
        <SettingsRow
          label="If Whisperer defeated"
          control={
            <Select value="new_whisperer_emerges" onChange={() => {}} disabled={d}>
              <option value="new_whisperer_emerges">New Whisperer emerges</option>
              <option value="whisperer_demoted_to_zombie">Demote to Zombie</option>
              <option value="season_escalation">Season escalation</option>
              <option value="commissioner_decides">Commissioner decides</option>
            </Select>
          }
        />
      </SettingsSection>
    </div>
  )
}
