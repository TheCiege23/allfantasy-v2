'use client'

import { SettingsSection, SettingsRow, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombiePaidPanel({ canEdit }: { canEdit: boolean }) {
  const d = !canEdit
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-paid" title="Payment mode">
        <SettingsRow label="Buy-in ($)" control={<Input type="number" disabled={d} className="w-32" />} />
        <SettingsRow label="Commissioner fee %" control={<Input type="number" disabled={d} className="w-24" />} />
      </SettingsSection>
      <SettingsSection id="zm-free" title="Free mode labels">
        <SettingsRow label="Currency label" control={<Input defaultValue="Outbreak Points" disabled={d} />} />
      </SettingsSection>
    </div>
  )
}
