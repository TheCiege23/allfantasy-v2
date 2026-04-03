'use client'

import type { AutosaveStatus } from '@/lib/hooks/useAutosave'

export type SettingsNavTabId =
  | 'league'
  | 'team'
  | 'roster'
  | 'scoring'
  | 'draft'
  | 'divisions'
  | 'members'
  | 'coowners'
  | 'commissioner'
  | 'previous'
  | 'delete'

const NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'league', label: 'League' },
  { id: 'team', label: 'Team' },
  { id: 'roster', label: 'Roster' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'draft', label: 'Draft' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'members', label: 'Members' },
  { id: 'coowners', label: 'Co-owners' },
  { id: 'commissioner', label: 'Commissioner' },
  { id: 'previous', label: 'Previous' },
  { id: 'delete', label: 'Delete' },
]

function statusLabel(s: AutosaveStatus): string | null {
  if (s === 'saving') return 'Saving…'
  if (s === 'saved') return 'Saved'
  if (s === 'error') return 'Save failed'
  return null
}

export function SettingsNav({
  activeTab,
  onSelect,
  saveStatus,
}: {
  activeTab: SettingsNavTabId
  onSelect: (id: SettingsNavTabId) => void
  saveStatus: AutosaveStatus
}) {
  const hint = statusLabel(saveStatus)
  return (
    <nav className="flex w-52 flex-shrink-0 flex-col gap-0.5 border-r border-white/[0.08] bg-[#080c14] p-3">
      {NAV.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
            activeTab === t.id
              ? 'bg-sky-500/15 font-medium text-sky-200'
              : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'
          }`}
        >
          {t.label}
        </button>
      ))}
      {hint ? <p className="mt-2 px-2 text-[11px] text-white/40">{hint}</p> : null}
    </nav>
  )
}
