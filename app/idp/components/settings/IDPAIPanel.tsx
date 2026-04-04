'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/components/settings/ui'

export function IDPAIPanel({ hasAfSub }: { hasAfSub: boolean }) {
  const [a, setA] = useState(true)
  const [b, setB] = useState(true)
  const [c, setC] = useState(true)
  const [d, setD] = useState(true)
  const [e, setE] = useState(true)

  return (
    <div className="pb-8">
      {!hasAfSub ? (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-[12px] text-amber-100">
          <Lock className="h-4 w-4 shrink-0" />
          AF Commissioner Subscription gates IDP AI execution — toggles below are UI preferences only.
        </div>
      ) : null}
      <SettingsSection title="IDP AI toggles" description="Preference flags for Chimmy surfaces (AfSub required at runtime).">
        <SettingsRow label="Start/Sit recommendations">
          <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} disabled={!hasAfSub} />
        </SettingsRow>
        <SettingsRow label="Waiver breakout alerts">
          <input type="checkbox" checked={b} onChange={(e) => setB(e.target.checked)} disabled={!hasAfSub} />
        </SettingsRow>
        <SettingsRow label="Matchup-based IDP analysis">
          <input type="checkbox" checked={c} onChange={(e) => setC(e.target.checked)} disabled={!hasAfSub} />
        </SettingsRow>
        <SettingsRow label="Weekly IDP rankings">
          <input type="checkbox" checked={d} onChange={(e) => setD(e.target.checked)} disabled={!hasAfSub} />
        </SettingsRow>
        <SettingsRow label="Trade balance analysis">
          <input type="checkbox" checked={e} onChange={(e) => setE(e.target.checked)} disabled={!hasAfSub} />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
