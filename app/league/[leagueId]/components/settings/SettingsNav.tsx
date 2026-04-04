'use client'

import clsx from 'clsx'
import type { AutosaveStatus } from '@/lib/hooks/useAutosave'

export type SettingsNavTabId =
  | 'league'
  | 'sport_config'
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
  | 'idp_roster'
  | 'idp_scoring'
  | 'idp_display'
  | 'idp_ai'
  | 'idp_cap'
  | 'devy_format'
  | 'devy_roster'
  | 'devy_rules'
  | 'devy_taxi'
  | 'devy_drafts'
  | 'devy_import'
  | 'devy_ai'
  | 'c2c_format'
  | 'c2c_rosters'
  | 'c2c_scoring'
  | 'c2c_taxi'
  | 'c2c_devy'
  | 'c2c_drafts'
  | 'c2c_ai'

const BASE_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'league', label: 'League' },
  { id: 'sport_config', label: '⚙️ Scoring & Roster' },
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

const IDP_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'idp_roster', label: '🛡️ IDP Roster' },
  { id: 'idp_scoring', label: '📊 IDP Scoring' },
  { id: 'idp_display', label: '🎨 IDP Display' },
  { id: 'idp_ai', label: '🤖 IDP AI' },
  { id: 'idp_cap', label: '💰 IDP Cap' },
]

const DEVY_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'devy_format', label: '🏈 League Format' },
  { id: 'devy_roster', label: '📋 Rosters' },
  { id: 'devy_rules', label: '🎓 Devy Rules' },
  { id: 'devy_taxi', label: '🚕 Taxi Rules' },
  { id: 'devy_drafts', label: '🎲 Drafts' },
  { id: 'devy_import', label: '📥 Import' },
  { id: 'devy_ai', label: '🤖 AI Settings' },
]

const C2C_NAV: { id: SettingsNavTabId; label: string }[] = [
  { id: 'c2c_format', label: '🏆 League Format' },
  { id: 'c2c_rosters', label: '📋 Rosters' },
  { id: 'c2c_scoring', label: '📊 Scoring' },
  { id: 'c2c_taxi', label: '🚕 Taxi Rules' },
  { id: 'c2c_devy', label: '🎓 Devy Rules' },
  { id: 'c2c_drafts', label: '🎲 Drafts' },
  { id: 'c2c_ai', label: '🤖 AI Settings' },
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

export function isIdpSettingsTab(id: SettingsNavTabId): boolean {
  return id.startsWith('idp_')
}

export function isDevySettingsTab(id: SettingsNavTabId): boolean {
  return id.startsWith('devy_')
}

export function isC2cSettingsTab(id: SettingsNavTabId): boolean {
  return id.startsWith('c2c_')
}

export function SettingsNav({
  activeTab,
  onSelect,
  saveStatus,
  showSurvivorTabs,
  showZombieTabs,
  showIdpTabs,
  showDevyTabs,
  showC2cTabs,
  className,
}: {
  activeTab: SettingsNavTabId
  onSelect: (id: SettingsNavTabId) => void
  saveStatus: AutosaveStatus
  showSurvivorTabs?: boolean
  showZombieTabs?: boolean
  showIdpTabs?: boolean
  showDevyTabs?: boolean
  showC2cTabs?: boolean
  className?: string
}) {
  const hint = statusLabel(saveStatus)
  const items = [
    ...BASE_NAV,
    ...(showSurvivorTabs ? SURVIVOR_NAV : []),
    ...(showZombieTabs ? ZOMBIE_NAV : []),
    ...(showIdpTabs ? IDP_NAV : []),
    ...(showDevyTabs ? DEVY_NAV : []),
    ...(showC2cTabs ? C2C_NAV : []),
  ]

  return (
    <nav
      className={clsx(
        'flex flex-shrink-0 flex-col gap-0.5 border-white/[0.08] bg-[#080c14] p-3 md:border-r',
        'max-h-[min(280px,38vh)] w-full overflow-x-auto overflow-y-auto md:max-h-[min(85vh,900px)] md:w-52',
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
