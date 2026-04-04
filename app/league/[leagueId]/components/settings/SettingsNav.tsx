'use client'

import clsx from 'clsx'
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
  | 'survivor_setup'
  | 'survivor_tribes'
  | 'survivor_challenges'
  | 'survivor_tribal'
  | 'survivor_idols'
  | 'survivor_exile'
  | 'survivor_merge'
  | 'survivor_chat'
  | 'survivor_ai'
  | 'survivor_advanced'
  | 'zombie_setup'
  | 'zombie_whisperer'
  | 'zombie_combat'
  | 'zombie_items'
  | 'zombie_paid'
  | 'zombie_universe'
  | 'zombie_updates'
  | 'zombie_animations'
  | 'zombie_advanced'
  | 'zombie_ai'

const BASE_NAV: { id: SettingsNavTabId; label: string }[] = [
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

const ZOMBIE_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'zombie_setup', label: '🧟 Zombie Setup' },
  { id: 'zombie_whisperer', label: '🎭 Whisperer' },
  { id: 'zombie_combat', label: '⚔️ Combat Rules' },
  { id: 'zombie_items', label: '🧪 Serums & Weapons' },
  { id: 'zombie_paid', label: '💰 Paid / Free' },
  { id: 'zombie_universe', label: '🌍 Universe' },
  { id: 'zombie_updates', label: '📋 Weekly Updates' },
  { id: 'zombie_animations', label: '🎬 Animations' },
  { id: 'zombie_advanced', label: '⚙️ Advanced Rules' },
  { id: 'zombie_ai', label: '🤖 AI Host' },
]

const SURVIVOR_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'survivor_setup', label: '🏝 Survivor Setup' },
  { id: 'survivor_tribes', label: '🔥 Tribes' },
  { id: 'survivor_challenges', label: '⚡ Challenges' },
  { id: 'survivor_tribal', label: '🗳 Tribal Council' },
  { id: 'survivor_idols', label: '🔮 Idols & Powers' },
  { id: 'survivor_exile', label: '🏚 Exile Island' },
  { id: 'survivor_merge', label: '🌊 Merge & Jury' },
  { id: 'survivor_chat', label: '💬 Chat & Permissions' },
  { id: 'survivor_ai', label: '🤖 AI Host' },
  { id: 'survivor_advanced', label: '⚙️ Advanced Rules' },
]

function statusLabel(s: AutosaveStatus): string | null {
  if (s === 'saving') return 'Saving…'
  if (s === 'saved') return 'Saved'
  if (s === 'error') return 'Save failed'
  return null
}

export function isSurvivorSettingsTab(id: SettingsNavTabId): boolean {
  return id.startsWith('survivor_')
}

export function isZombieSettingsTab(id: SettingsNavTabId): boolean {
  return id.startsWith('zombie_')
}

export function SettingsNav({
  activeTab,
  onSelect,
  saveStatus,
  showSurvivorTabs,
  showZombieTabs,
  className,
}: {
  activeTab: SettingsNavTabId
  onSelect: (id: SettingsNavTabId) => void
  saveStatus: AutosaveStatus
  showSurvivorTabs?: boolean
  showZombieTabs?: boolean
  className?: string
}) {
  const hint = statusLabel(saveStatus)
  const items = [
    ...BASE_NAV,
    ...(showSurvivorTabs ? SURVIVOR_NAV : []),
    ...(showZombieTabs ? ZOMBIE_NAV : []),
  ]

  return (
    <nav
      className={clsx(
        'flex flex-shrink-0 flex-col gap-0.5 border-white/[0.08] bg-[#080c14] p-3 md:border-r',
        'max-h-[min(280px,38vh)] w-full overflow-y-auto overflow-x-hidden md:max-h-none md:w-52',
        className,
      )}
    >
      {items.map((t) => (
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
