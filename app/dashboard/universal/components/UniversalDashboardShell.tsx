'use client'

/**
 * Top-level shell for the Phase 2 universal dashboard: two-row header
 * (DashboardHeader, includes the settings menu), left Sidebar, right rail,
 * and an OS launcher strip above the main content. `children` is the main
 * content area — for now the existing UniversalLeaguesBoard content; later
 * pieces (Priority by Platform, Dynasty Planet search, Portfolio Analytics,
 * tabbed chat, Legacy modules) extend what renders there.
 */

import type { ReactNode } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import { useSettingsProfile } from '@/hooks/useSettingsProfile'
import { DashboardHeader } from './DashboardHeader'
import { Sidebar } from './Sidebar'
import { RightRail } from './RightRail'
import { OsLauncherStrip } from './OsLauncherStrip'
import { FloatingChat } from './FloatingChat'
import styles from './universal-dashboard.module.css'

type ShellLeague = UserLeague & { navigationLeagueId?: string | null }

export function UniversalDashboardShell({
  leagues,
  children,
}: {
  leagues: ShellLeague[]
  children: ReactNode
}) {
  const isCommissionerAnywhere = leagues.some((l) => l.isCommissioner || l.userRole === 'commissioner')
  const { profile } = useSettingsProfile()
  const firstName = (profile?.displayName || profile?.username || '').split(/\s+/)[0]

  return (
    <>
      <DashboardHeader isCommissionerAnywhere={isCommissionerAnywhere} />
      <div className={styles.shell}>
        <Sidebar waiverCount={null} dmCount={null} />
        <main className={styles.main}>
          <div className={styles.hello}>{firstName ? `Welcome back, ${firstName}! 👋` : 'Welcome back! 👋'}</div>
          <p className={styles.subhello}>
            Every league across every platform — powered by your Operating Systems underneath, surfaced only when
            you need it.
          </p>
          <OsLauncherStrip />
          {children}
        </main>
        <RightRail />
      </div>
      <FloatingChat leagues={leagues} />
    </>
  )
}
