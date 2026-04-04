'use client'

import { SettingsSection, SettingsRow, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieUniversePanel({ canEdit }: { canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-uni" title="Universe settings">
        <SettingsRow label="Promotion count" control={<Input type="number" defaultValue={2} disabled={d} className="w-24" />} />
        <SettingsRow label="Relegation count" control={<Input type="number" defaultValue={2} disabled={d} className="w-24" />} />
      </SettingsSection>
    </div>
  )
}
