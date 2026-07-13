'use client'

/**
 * Two-row header: row 1 (topbar) = logo + Intelligence + messages/alerts +
 * user chip; row 2 (toolbar) = sport selector + search + live-data chip +
 * Operating Systems launcher. Matches _design-mocks/universal-dashboard.html's
 * `.topbar`/`.toolbar` structure.
 */

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IdentityImageRenderer } from '@/components/identity/IdentityImageRenderer'
import { useSettingsProfile } from '@/hooks/useSettingsProfile'
import { SettingsMenu } from './SettingsMenu'
import styles from './universal-dashboard.module.css'

export function DashboardHeader({ isCommissionerAnywhere }: { isCommissionerAnywhere: boolean }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { profile } = useSettingsProfile()

  const displayName = profile?.displayName || profile?.username || 'Your account'
  const role = isCommissionerAnywhere ? 'Commissioner' : 'Manager'

  return (
    <>
      <div className={styles.topbar}>
        <Link href="/dashboard/universal" className={styles.logo}>
          <Image
            src="/brand/af-shield-transparent.png"
            alt="AllFantasy"
            width={26}
            height={26}
            className={styles.logoMark}
          />
          <span className={styles.wordmark}>AllFantasy</span>
        </Link>
        <div className={styles.spacer} />
        <Link href="/chimmy" className={styles.intelBtn}>
          ✦ Intelligence
        </Link>
        <Link href="/messages" className={styles.iconBtn} aria-label="Messages">
          💬
        </Link>
        <Link href="/app/notifications" className={styles.iconBtn} aria-label="Notifications">
          🔔
        </Link>
        <button
          type="button"
          className={styles.userChip}
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          <div className={styles.avatar}>
            <IdentityImageRenderer
              avatarUrl={profile?.profileImageUrl}
              avatarPreset={profile?.avatarPreset}
              displayName={profile?.displayName}
              username={profile?.username}
              size="sm"
            />
          </div>
          <div className={styles.userText}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userRole}>{role}</div>
          </div>
          <span className={styles.caret}>▾</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tbLeft}>
          <button type="button" className={styles.sportPill}>
            🏈 All sports ▾
          </button>
          <div className={styles.search}>
            <span aria-hidden>🔍</span>
            <input type="search" placeholder="Search players, teams, leagues…" />
            <span className={styles.kbd}>⌘K</span>
          </div>
        </div>
        <div className={styles.tbRight}>
          <span
            className={styles.liveChip}
            title="Sports · Weather · Injuries · News · Odds · GIF · Intelligence — all connected"
          >
            <span className={styles.liveDot} /> Live data connected
          </span>
          <Link href="/dashboard/universal#os-strip" className={styles.osBtn}>
            ⊞ Operating Systems
          </Link>
        </div>
      </div>

      {settingsOpen && <SettingsMenu onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
