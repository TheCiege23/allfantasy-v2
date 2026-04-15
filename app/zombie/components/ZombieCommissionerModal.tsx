'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { ZombieUpdatesPanel } from './commissioner/ZombieUpdatesPanel'
import { ZombieAutomationPanel } from './commissioner/ZombieAutomationPanel'
import { ZombieAuditLogPanel } from './commissioner/ZombieAuditLogPanel'
import { ZombieOverridePanel } from './commissioner/ZombieOverridePanel'
import { ZombieSetupPanel } from './commissioner/ZombieSetupPanel'
import { ZombieWhispererPanel } from './commissioner/ZombieWhispererPanel'
import { ZombieCombatPanel } from './commissioner/ZombieCombatPanel'
import { ZombieItemsPanel } from './commissioner/ZombieItemsPanel'
import { ZombiePaidPanel } from './commissioner/ZombiePaidPanel'
import { ZombieUniversePanel } from './commissioner/ZombieUniversePanel'
import { ZombieAnimationsPanel } from './commissioner/ZombieAnimationsPanel'
import { ZombieAdvancedPanel } from './commissioner/ZombieAdvancedPanel'

type Tab =
  | 'general'
  | 'paid'
  | 'universe'
  | 'whisperer'
  | 'combat'
  | 'items'
  | 'updates'
  | 'automation'
  | 'overrides'
  | 'audit'
  | 'animations'
  | 'advanced'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '🏟️' },
  { id: 'paid', label: 'Free / Paid', icon: '💰' },
  { id: 'universe', label: 'Universe', icon: '🌍' },
  { id: 'whisperer', label: 'Whisperer', icon: '🎭' },
  { id: 'combat', label: 'Combat', icon: '⚔️' },
  { id: 'items', label: 'Items', icon: '🎒' },
  { id: 'updates', label: 'Updates', icon: '📝' },
  { id: 'automation', label: 'Automation', icon: '⚙️' },
  { id: 'overrides', label: 'Overrides', icon: '🔧' },
  { id: 'audit', label: 'Audit', icon: '📋' },
  { id: 'animations', label: 'Visuals', icon: '🎬' },
  { id: 'advanced', label: 'Advanced', icon: '🧬' },
]

export function ZombieCommissionerModal({
  open,
  onClose,
  leagueId,
}: {
  open: boolean
  onClose: () => void
  leagueId: string
}) {
  const [tab, setTab] = useState<Tab>('general')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Commissioner Settings"
    >
      <div
        className="flex h-[90vh] max-h-[700px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--zombie-border)] bg-[var(--zombie-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)] px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--zombie-crimson)]">
              Commissioner Settings
            </p>
            <p className="text-[13px] font-semibold text-[var(--zombie-text-full)]">
              Zombie League Configuration
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--zombie-text-dim)] transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Tab sidebar (desktop) / horizontal scroll (mobile) */}
          <nav className="hidden w-[180px] shrink-0 overflow-y-auto border-r border-[var(--zombie-border)] bg-[var(--zombie-panel)] py-2 md:block">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex w-full items-center gap-2 px-4 py-2 text-[12px] text-left transition-colors',
                  tab === t.id
                    ? 'bg-[var(--zombie-crimson)]/10 text-[var(--zombie-crimson)] font-semibold'
                    : 'text-[var(--zombie-text-dim)] hover:bg-white/[0.03] hover:text-[var(--zombie-text-mid)]',
                )}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile tab scroller */}
          <div className="flex overflow-x-auto border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-1 md:hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] whitespace-nowrap transition',
                  tab === t.id
                    ? 'bg-[var(--zombie-crimson)]/15 text-[var(--zombie-crimson)] font-semibold'
                    : 'text-[var(--zombie-text-dim)]',
                )}
              >
                <span>{t.icon}</span>
                <span className="hidden xs:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'general' && <ZombieSetupPanel leagueId={leagueId} canEdit />}
            {tab === 'paid' && <ZombiePaidPanel canEdit />}
            {tab === 'universe' && <ZombieUniversePanel canEdit />}
            {tab === 'whisperer' && <ZombieWhispererPanel canEdit />}
            {tab === 'combat' && <ZombieCombatPanel canEdit />}
            {tab === 'items' && <ZombieItemsPanel canEdit />}
            {tab === 'updates' && <ZombieUpdatesPanel leagueId={leagueId} canEdit />}
            {tab === 'automation' && <ZombieAutomationPanel leagueId={leagueId} canEdit />}
            {tab === 'overrides' && <ZombieOverridePanel leagueId={leagueId} canEdit />}
            {tab === 'audit' && <ZombieAuditLogPanel leagueId={leagueId} canEdit />}
            {tab === 'animations' && <ZombieAnimationsPanel leagueId={leagueId} canEdit />}
            {tab === 'advanced' && <ZombieAdvancedPanel leagueId={leagueId} canEdit />}
          </div>
        </div>
      </div>
    </div>
  )
}
