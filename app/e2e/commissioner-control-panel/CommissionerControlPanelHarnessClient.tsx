'use client'

import { useState } from 'react'
import GeneralSettingsPanel from '@/components/app/settings/GeneralSettingsPanel'
import RosterSettingsPanel from '@/components/app/settings/RosterSettingsPanel'
import ScoringSettingsPanel from '@/components/app/settings/ScoringSettingsPanel'
import WaiverSettingsPanel from '@/components/app/settings/WaiverSettingsPanel'
import TradeSettingsPanel from '@/components/app/settings/TradeSettingsPanel'
import DraftSettingsPanel from '@/components/app/settings/DraftSettingsPanel'
import MemberSettingsPanel from '@/components/app/settings/MemberSettingsPanel'
import CommissionerControlsPanel from '@/components/app/settings/CommissionerControlsPanel'
import ResetLeaguePanel from '@/components/app/settings/ResetLeaguePanel'

type SectionKey =
  | 'general'
  | 'roster'
  | 'scoring'
  | 'waiver'
  | 'trade'
  | 'draft'
  | 'members'
  | 'controls'
  | 'reset'

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'general', label: 'General Settings' },
  { key: 'roster', label: 'Roster Settings' },
  { key: 'scoring', label: 'Scoring Settings' },
  { key: 'waiver', label: 'Waiver Settings' },
  { key: 'trade', label: 'Trade Settings' },
  { key: 'draft', label: 'Draft Settings' },
  { key: 'members', label: 'Member Settings' },
  { key: 'controls', label: 'Commissioner Controls' },
  { key: 'reset', label: 'Reset League' },
]

export function CommissionerControlPanelHarnessClient({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<SectionKey>('general')

  return (
    <main className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <h1 className="mb-4 text-xl font-semibold">E2E Commissioner Control Panel Harness</h1>
      {!open ? (
        <button
          type="button"
          data-testid="commissioner-panel-open"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/25"
        >
          Open commissioner panel
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                data-testid={`commissioner-section-${section.key}`}
                onClick={() => setActive(section.key)}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  active === section.key
                    ? 'bg-white text-black'
                    : 'border border-white/10 bg-black/20 text-white/80 hover:bg-white/10'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {active === 'general' && <GeneralSettingsPanel leagueId={leagueId} />}
          {active === 'roster' && <RosterSettingsPanel leagueId={leagueId} />}
          {active === 'scoring' && <ScoringSettingsPanel leagueId={leagueId} />}
          {active === 'waiver' && <WaiverSettingsPanel leagueId={leagueId} />}
          {active === 'trade' && <TradeSettingsPanel leagueId={leagueId} />}
          {active === 'draft' && <DraftSettingsPanel leagueId={leagueId} />}
          {active === 'members' && <MemberSettingsPanel leagueId={leagueId} />}
          {active === 'controls' && <CommissionerControlsPanel leagueId={leagueId} />}
          {active === 'reset' && <ResetLeaguePanel leagueId={leagueId} />}
        </div>
      )}
    </main>
  )
}
