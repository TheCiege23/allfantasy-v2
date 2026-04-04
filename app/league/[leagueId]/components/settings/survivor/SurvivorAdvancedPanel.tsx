'use client'

import { useState } from 'react'
import { SettingsSection, SettingsRow, Toggle, DangerButton } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'

export function SurvivorAdvancedPanel({ canEdit }: SurvivorSettingsPanelProps) {
  const [override, setOverride] = useState(false)
  const [audit, setAudit] = useState(true)
  const [adminOverlay, setAdminOverlay] = useState(false)
  const [daily, setDaily] = useState(false)
  const [weeklyRecap, setWeeklyRecap] = useState(true)
  const [challengeRemind, setChallengeRemind] = useState(true)
  const [tribalCd, setTribalCd] = useState(true)
  const d = !canEdit

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">Dangerous actions require confirmation in production builds.</p>
      <SettingsSection id="sv-comm-controls" title="Commissioner controls">
        <SettingsRow label="Manual override on results" control={<Toggle checked={override} onChange={setOverride} disabled={d} />} />
        <SettingsRow label="Show audit trail" control={<Toggle checked={audit} onChange={setAudit} disabled={d} />} />
        <SettingsRow label="Admin overlay (debug)" control={<Toggle checked={adminOverlay} onChange={setAdminOverlay} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-messages" title="Daily vs weekly messages">
        <SettingsRow label="Daily island messages" control={<Toggle checked={daily} onChange={setDaily} disabled={d} />} />
        <SettingsRow label="Weekly recap" control={<Toggle checked={weeklyRecap} onChange={setWeeklyRecap} disabled={d} />} />
        <SettingsRow label="Challenge-day reminders" control={<Toggle checked={challengeRemind} onChange={setChallengeRemind} disabled={d} />} />
        <SettingsRow label="Tribal-day countdown" control={<Toggle checked={tribalCd} onChange={setTribalCd} disabled={d} />} />
      </SettingsSection>
      <SettingsSection id="sv-scoring" title="Scoring integration">
        <SettingsRow label="Tribe score method" description="Sum / avg / median — follows league scoring sport." control={<span className="text-white/45">Sum (preview)</span>} />
        <SettingsRow label="Individual immunity rule" control={<span className="text-white/45">Top scorer (preview)</span>} />
      </SettingsSection>
      <SettingsSection id="sv-destructive" title="Destructive (confirm)">
        <SettingsRow
          label="Reset tribe assignments"
          control={<DangerButton disabled={d} onClick={() => {}}>Reset…</DangerButton>}
        />
        <SettingsRow label="Force merge now" control={<DangerButton disabled={d} onClick={() => {}}>Force merge…</DangerButton>} />
        <SettingsRow label="Override tribal result" control={<DangerButton disabled={d} onClick={() => {}}>Override…</DangerButton>} />
      </SettingsSection>
    </div>
  )
}
