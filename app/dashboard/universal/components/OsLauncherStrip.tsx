'use client'

/**
 * "Jump to an OS" strip — real links into each Operating System surface that
 * already exists in the app. Matches _design-mocks/universal-dashboard.html's
 * `.os-strip`.
 */

import Link from 'next/link'
import styles from './universal-dashboard.module.css'

const OS_LINKS: { label: string; href: string }[] = [
  { label: 'Decision OS', href: '/dashboard' },
  { label: 'Draft OS', href: '/dashboard' },
  { label: 'Trade OS', href: '/dashboard' },
  { label: 'Waiver OS', href: '/dashboard' },
  { label: 'Manager OS', href: '/af-legacy' },
  { label: 'Commissioner OS', href: '/commissioner-os' },
  { label: 'League OS', href: '/dashboard' },
]

export function OsLauncherStrip() {
  return (
    <div className={styles.osStrip} id="os-strip">
      <span className={styles.osLead}>⊞ Jump to an OS</span>
      {OS_LINKS.map((os) => (
        <Link key={os.label} href={os.href} className={styles.osChip}>
          {os.label}
        </Link>
      ))}
      <span className={styles.osNote}>Always on · working behind every screen</span>
    </div>
  )
}
