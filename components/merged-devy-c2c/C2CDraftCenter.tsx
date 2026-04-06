'use client'

/**
 * PROMPT 4: C2C Draft Center — Merged Startup, Pro Startup, College Startup, Rookie, College, optional Merged Rookie+College.
 * Snake/linear visualizations; asset-type badges; class depth sidebar placeholder.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Layers, Users, GraduationCap, BookOpen, Package } from 'lucide-react'
import { C2CAssetBadge } from './C2CAssetBadge'

type C2CDraftTab = 'merged_startup' | 'pro_startup' | 'college_startup' | 'rookie' | 'college' | 'merged_rookie_college'

export function C2CDraftCenter({
  leagueId,
  mergedStartupDraft,
  separateStartupCollegeDraft,
  mergedRookieCollegeDraft,
}: {
  leagueId: string
  mergedStartupDraft?: boolean
  separateStartupCollegeDraft?: boolean
  mergedRookieCollegeDraft?: boolean
}) {
  const [draftTab, setDraftTab] = useState<C2CDraftTab>(
    mergedStartupDraft ? 'merged_startup' : separateStartupCollegeDraft ? 'pro_startup' : 'merged_startup'
  )

  const tabs: { id: C2CDraftTab; label: string; icon: React.ReactNode; show?: boolean }[] = [
    { id: 'merged_startup' as C2CDraftTab, label: 'Merged Startup', icon: <Layers className="h-4 w-4" />, show: mergedStartupDraft },
    { id: 'pro_startup' as C2CDraftTab, label: 'Pro Startup', icon: <Users className="h-4 w-4" />, show: separateStartupCollegeDraft },
    { id: 'college_startup' as C2CDraftTab, label: 'College Startup', icon: <GraduationCap className="h-4 w-4" />, show: separateStartupCollegeDraft },
    { id: 'rookie' as C2CDraftTab, label: 'Rookie Draft', icon: <BookOpen className="h-4 w-4" />, show: true },
    { id: 'college' as C2CDraftTab, label: 'College Draft', icon: <GraduationCap className="h-4 w-4" />, show: true },
    { id: 'merged_rookie_college' as C2CDraftTab, label: 'Merged Rookie + College', icon: <Package className="h-4 w-4" />, show: mergedRookieCollegeDraft },
  ].filter((t) => t.show !== false)

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">C2C Draft Center</h3>
      <p className="text-xs text-white/60">
        Draft modes: {mergedStartupDraft ? 'Merged (pro + college in one draft)' : 'Separate pro then college'}. Rookie and college drafts run annually. Asset-type badges show college vs pro in merged boards.
      </p>
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDraftTab(t.id)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition min-h-[44px] ${
              draftTab === t.id ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <C2CAssetBadge type="COLLEGE" />
        <C2CAssetBadge type="PROMOTED" />
        <C2CAssetBadge type="ROOKIE_POOL" />
        <span className="text-xs text-white/50">Snake or linear per league settings. Class depth and risk labels in sidebar when viewing draft board.</span>
      </div>
      <Link
        href={`/league/${leagueId}?tab=Draft`}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
      >
        Open draft room
      </Link>
    </div>
  )
}
