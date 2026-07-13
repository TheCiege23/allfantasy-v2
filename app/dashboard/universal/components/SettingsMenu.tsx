'use client'

/**
 * Settings dropdown opened from the header user chip. Matches
 * _design-mocks/universal-dashboard.html's `.settings-menu` structure, wired
 * to real data: profile (useSettingsProfile), token balance
 * (useTokenBalance), subscription plan + renewal (useEntitlements +
 * getDisplayPlanName), dark-mode toggle (useThemeMode), and connection
 * status sourced directly from the profile (Discord/Sleeper/Spotify are the
 * only providers with a real "connected" concept today — Yahoo/ESPN have no
 * standalone connection state, so they link to /import instead of showing a
 * fabricated on/off chip).
 */

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { IdentityImageRenderer } from '@/components/identity/IdentityImageRenderer'
import { useSettingsProfile } from '@/hooks/useSettingsProfile'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useOptionalThemeMode } from '@/components/theme/ThemeProvider'
import { getDisplayPlanName } from '@/lib/subscription/feature-access'
import styles from './universal-dashboard.module.css'

export function SettingsMenu({ onClose }: { onClose: () => void }) {
  const { profile } = useSettingsProfile()
  const { balance } = useTokenBalance()
  const { snapshot, hasAnyPaid } = useEntitlements()
  const themeMode = useOptionalThemeMode()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const planName = hasAnyPaid && snapshot?.plans?.[0] ? getDisplayPlanName(snapshot.plans[0]) : 'AllFantasy Free'
  const renewsAt = snapshot?.currentPeriodEnd
    ? new Date(snapshot.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  const isDark = themeMode?.mode === 'dark'

  const connections: { label: string; on: boolean }[] = [
    { label: 'Sleeper', on: Boolean(profile?.sleeperUsername) },
    { label: 'Discord', on: Boolean(profile?.discordUserId) },
    { label: 'Spotify', on: Boolean(profile?.spotifyConnectedAt) },
  ]

  return (
    <>
      <div className={styles.settingsOverlay} onClick={onClose} />
      <div className={styles.settingsMenu} ref={menuRef} role="menu" aria-label="Settings">
        <div className={styles.smSection}>
          <div className={styles.smHead}>
            <div className={styles.smAva}>
              <IdentityImageRenderer
                avatarUrl={profile?.profileImageUrl}
                avatarPreset={profile?.avatarPreset}
                displayName={profile?.displayName}
                username={profile?.username}
                size="md"
              />
            </div>
            <div>
              <div className={styles.smName}>{profile?.displayName || profile?.username || 'Your account'}</div>
              <div className={styles.smSub}>@{profile?.username || '—'}</div>
              <Link href="/settings" className={styles.smEdit} onClick={onClose}>
                Edit profile &amp; avatar →
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.smSection}>
          <div className={styles.smPlan}>
            <div>
              <div className={styles.smPlanLabel}>{planName}</div>
              <div className={styles.smPlanSub}>{renewsAt ? `Renews ${renewsAt} · billing & invoices` : 'Upgrade for more · billing & invoices'}</div>
            </div>
            <Link href="/settings" className={styles.smBtn} onClick={onClose}>
              Manage
            </Link>
          </div>
        </div>

        <div className={styles.smSection}>
          <div className={styles.smToken}>
            <span>
              ◆ Token balance <span className={styles.smTokenAmt}>{balance.toLocaleString()}</span>
            </span>
            <Link href="/tokens" className={styles.smBuy} onClick={onClose}>
              Buy more
            </Link>
          </div>
        </div>

        <div className={styles.smSection}>
          <div className={styles.smConnLabel}>Connections</div>
          <div className={styles.smConnRow}>
            {connections.map((c) => (
              <span key={c.label} className={`${styles.cchip} ${c.on ? styles.cchipOn : styles.cchipOff}`}>
                {c.on ? '●' : '＋'} {c.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.smList}>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            🖼 <span>Change app image</span>
            <span className={styles.smItemHint}>upload / pick</span>
          </Link>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            👤 <span>Account</span>
            <span className={styles.smItemHint}>email · phone · password</span>
          </Link>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            💳 <span>Subscription &amp; billing</span>
          </Link>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            🔔 <span>Notifications</span>
          </Link>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            🎚 <span>Preferences &amp; toggles</span>
          </Link>
          <button
            type="button"
            className={styles.smItem}
            onClick={() => themeMode?.setMode(isDark ? 'light' : 'dark')}
          >
            🌙 <span>Dark mode</span>
            <span className={`${styles.toggle} ${isDark ? styles.toggleOn : ''}`} aria-hidden>
              <span className={styles.toggleKnob} />
            </span>
          </button>
          <Link href="/settings" className={styles.smItem} onClick={onClose}>
            ⚙️ <span>All settings</span>
          </Link>
          <button
            type="button"
            className={`${styles.smItem} ${styles.smDanger}`}
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            🚪 <span>Log out</span>
          </button>
        </div>
      </div>
    </>
  )
}
