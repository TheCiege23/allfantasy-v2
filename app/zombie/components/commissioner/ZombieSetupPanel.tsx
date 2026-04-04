'use client'

import { SettingsSection, SettingsRow, Select, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieSetupPanel({ leagueId, canEdit }: { leagueId: string; canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">
        Zombie structure — persistence uses `/api/zombie/settings` when fields are added to the patch payload.
      </p>
      <SettingsSection id="zm-structure" title="League structure">
        <SettingsRow
          label="Team count"
          control={
            <Select value="20" onChange={() => {}} disabled={d}>
              {['12', '14', '16', '20', '24'].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          }
        />
        <SettingsRow
          label="Universe mode"
          description="Tied to universe assignment on the zombie league row."
          control={<Input value={leagueId} disabled className="opacity-50" />}
        />
      </SettingsSection>
    </div>
  )
}
