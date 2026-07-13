'use client'

/**
 * War Room teaser — gated behind the real 'future_planning' feature
 * (war_room tier), linking to the real /war-room draft-assistant tool
 * (pick recommendations, tier-cliff alerts, roster build strategy —
 * confirmed from app/war-room/page.tsx's own real metadata/copy, not
 * invented here).
 */

import Link from 'next/link'
import { FeatureGate } from '@/components/subscription/FeatureGate'
import styles from './universal-dashboard.module.css'

export function WarRoomPreview() {
  return (
    <>
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadLeft}>
          <h2>🎯 War Room</h2>
        </div>
      </div>
      <div className={styles.legacyCard}>
        <div className={styles.legacyBody}>
          <FeatureGate featureId="future_planning" featureNameOverride="War Room draft strategy">
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Pick recommendations, tier-cliff alerts, and roster-build strategy for your next draft.
            </p>
            <Link href="/war-room" className={`${styles.cta}`} style={{ marginTop: 12, display: 'inline-block', width: 'fit-content', padding: '9px 18px' }}>
              Open War Room →
            </Link>
          </FeatureGate>
        </div>
      </div>
    </>
  )
}
