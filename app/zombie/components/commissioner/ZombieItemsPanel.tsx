'use client'

import { SettingsSection, SettingsRow, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieItemsPanel({ canEdit }: { canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-serum" title="Serums">
        <SettingsRow label="Max serums / player" control={<Input type="number" defaultValue={5} disabled={d} className="w-24" />} />
        <SettingsRow label="Revive threshold" control={<Input type="number" defaultValue={3} disabled={d} className="w-24" />} />
      </SettingsSection>
      <SettingsSection id="zm-weapons" title="Weapons">
        <SettingsRow label="Bomb enabled" description="Off by default." control={<Input value="Requires schema + PATCH" disabled className="opacity-50" />} />
      </SettingsSection>
    </div>
  )
}
