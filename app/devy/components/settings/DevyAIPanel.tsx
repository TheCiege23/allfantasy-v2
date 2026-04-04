'use client'

import { SettingsRow, SettingsSection } from '@/app/league/[leagueId]/tabs/settings/components'

export function DevyAIPanel({ hasAfSub }: { hasAfSub: boolean }) {
  return (
    <div className="space-y-5 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <p className="text-[11px] text-amber-200/80">
        {hasAfSub
          ? 'AfSub active — Devy AI toggles are gated for premium workflows.'
          : 'AfSub required for Devy AI automations.'}
      </p>
      <SettingsSection id="devy-ai" title="Devy AI (preview)">
        <SettingsRow
          label="Devy scouting tools"
          control={<span className="text-white/40">{hasAfSub ? 'Coming soon' : 'Locked'}</span>}
        />
        <SettingsRow label="Draft AI" control={<span className="text-white/40">Coming soon</span>} />
        <SettingsRow label="Setup advisor" control={<span className="text-white/40">Coming soon</span>} />
        <SettingsRow label="Import assistant" control={<span className="text-white/40">Coming soon</span>} />
        <SettingsRow label="Commissioner copilot" control={<span className="text-white/40">Coming soon</span>} />
        <SettingsRow label="Auto summaries" control={<span className="text-white/40">Coming soon</span>} />
      </SettingsSection>
    </div>
  )
}
