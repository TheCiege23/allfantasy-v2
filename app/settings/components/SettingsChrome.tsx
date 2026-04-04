'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Archive,
  Bell,
  CreditCard,
  FileText,
  Gift,
  Home,
  Link2,
  Shield,
  Sliders,
  User,
} from 'lucide-react'

export type SettingsTabId =
  | 'profile'
  | 'preferences'
  | 'security'
  | 'notifications'
  | 'connected'
  | 'billing'
  | 'referral'
  | 'legacy'
  | 'legal'
  | 'account'

type NavItem = {
  id: SettingsTabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'connected', label: 'Connected Accounts', icon: Link2 },
  { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
  { id: 'referral', label: 'Referrals', icon: Gift },
  { id: 'legacy', label: 'Legacy Import', icon: Archive },
  { id: 'legal', label: 'Legal & Agreements', icon: FileText },
  { id: 'account', label: 'Account', icon: AlertTriangle },
]

export const SETTINGS_NAV = NAV_ITEMS

export function isSettingsTabId(value: string | null | undefined): value is SettingsTabId {
  return SETTINGS_NAV.some((n) => n.id === value)
}

export function SettingsChrome({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: SettingsTabId
  onTabChange: (id: SettingsTabId) => void
  children: ReactNode
}) {
  const router = useRouter()

  const NavButton = ({ tab, mobile }: { tab: NavItem; mobile?: boolean }) => {
    const Icon = tab.icon
    const active = activeTab === tab.id
    return (
      <button
        type="button"
        onClick={() => onTabChange(tab.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
          mobile ? 'shrink-0 whitespace-nowrap' : ''
        } ${
          active
            ? 'border-l-2 border-cyan-400 bg-cyan-500/10 text-white'
            : 'border-l-2 border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-cyan-400/80" />
        {tab.label}
      </button>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0d1117] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0d1117] px-4 py-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/[0.08]"
          data-testid="settings-home"
        >
          <Home className="h-5 w-5 text-cyan-400/90" strokeWidth={2} />
          Home
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">Settings</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-white/[0.08] px-2 py-2 md:hidden"
          aria-label="Settings sections"
        >
          {SETTINGS_NAV.map((tab) => (
            <NavButton key={tab.id} tab={tab} mobile />
          ))}
        </nav>

        <aside
          className="hidden w-60 shrink-0 flex-col border-r border-white/[0.08] bg-[#0a0e1a] p-3 md:flex"
          aria-label="Settings navigation"
        >
          <div className="rounded-xl border border-white/[0.06] bg-[#1a1f3a]/50 p-2">
            {SETTINGS_NAV.map((tab) => (
              <NavButton key={tab.id} tab={tab} />
            ))}
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-[#1a1f3a] p-5 shadow-xl sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
