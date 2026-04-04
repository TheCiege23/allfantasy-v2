'use client'

import { SettingsSection, SettingsRow, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieCombatPanel({ canEdit }: { canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-bash" title="Bashing rules">
        <SettingsRow label="Bashing threshold" control={<Input type="number" defaultValue={30} disabled={d} className="w-24" />} />
        <SettingsRow label="Decision window (hours)" control={<Input type="number" defaultValue={48} disabled={d} className="w-24" />} />
      </SettingsSection>
      <SettingsSection id="zm-maul" title="Mauling rules">
        <SettingsRow label="Mauling threshold" control={<Input type="number" defaultValue={50} disabled={d} className="w-24" />} />
      </SettingsSection>
    </div>
  )
}
