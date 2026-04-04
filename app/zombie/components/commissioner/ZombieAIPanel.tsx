'use client'

import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieAIPanel({ hasAfSub }: { hasAfSub: boolean }) {
  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">
        {hasAfSub ? 'AfSub active — AI host toggles wire to `zombieHost` jobs.' : 'AfSub required for AI host automations.'}
      </p>
      <SettingsSection id="zm-ai" title="AI host">
        <SettingsRow label="Auto weekly recap" control={<span className="text-white/40">Coming soon</span>} />
        <SettingsRow label="Event commentary" control={<span className="text-white/40">Coming soon</span>} />
      </SettingsSection>
    </div>
  )
}
