'use client'

/**
 * PROMPT 4: C2C Team page — Pro Roster, College Roster, Taxi, Future Picks, Promotion Center.
 * Mobile-first tabs and asset badges.
 */

import { useState } from 'react'
import { Users, GraduationCap, Car, FileText, ArrowUpCircle } from 'lucide-react'
import { C2CAssetBadge } from './C2CAssetBadge'
import { C2CPromotionPanel } from './C2CPromotionPanel'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import { MetricCard } from '@/components/app/league/SmartDataView'
import RosterBoard from '@/components/app/roster/RosterBoard'

type C2CTeamSubTab = 'pro' | 'college' | 'taxi' | 'picks' | 'promotion'

export function C2CTeamTab({ leagueId, rosterId }: { leagueId: string; rosterId?: string }) {
  const [subTab, setSubTab] = useState<C2CTeamSubTab>('pro')
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'roster')
  const rosterArray = Array.isArray((data as any)?.roster) ? ((data as any).roster as any[]) : []

  const tabs: { id: C2CTeamSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pro', label: 'Pro Roster', icon: <Users className="h-4 w-4" /> },
    { id: 'college', label: 'College Roster', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'taxi', label: 'Taxi', icon: <Car className="h-4 w-4" /> },
    { id: 'picks', label: 'Future Picks', icon: <FileText className="h-4 w-4" /> },
    { id: 'promotion', label: 'Promotion Center', icon: <ArrowUpCircle className="h-4 w-4" /> },
  ]

  return (
    <TabDataState title="Team" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <p className="text-xs text-white/60">
          C2C links your college and pro pipeline in one dynasty ecosystem. College assets score only on the college side until promotion.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition min-h-[44px] touch-manipulation ${
                subTab === t.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'pro' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <C2CAssetBadge type="PROMOTED" />
              <span className="text-xs text-white/50">Pro roster: NFL/NBA players and promoted college assets.</span>
            </div>
            <MetricCard label="Total players" value={rosterArray.length} />
            <RosterBoard leagueId={leagueId} />
          </div>
        )}

        {subTab === 'college' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <C2CAssetBadge type="COLLEGE" />
              <C2CAssetBadge type="DECLARED" />
              <C2CAssetBadge type="DRAFTED" />
              <span className="text-xs text-white/50">College roster: NCAA-eligible players; they score only in college contests until promotion.</span>
            </div>
            <p className="text-sm text-white/70">College roster view uses the same roster data; college-eligible players are tagged. Use Promotion Center to promote when eligible.</p>
            <RosterBoard leagueId={leagueId} />
          </div>
        )}

        {subTab === 'taxi' && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">Taxi squad: eligible rookies and/or college stashes per league settings. Shown in roster board under Taxi slot.</p>
            <RosterBoard leagueId={leagueId} />
          </div>
        )}

        {subTab === 'picks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <C2CAssetBadge type="ROOKIE_POOL" />
              <span className="text-xs text-white/50">Future rookie and college picks. Tradeable per league rules.</span>
            </div>
            <p className="text-sm text-white/70">Future picks are managed in league draft settings and trade flow. This view will list your owned picks when integrated.</p>
          </div>
        )}

        {subTab === 'promotion' && (
          <div className="space-y-4">
            <C2CPromotionPanel leagueId={leagueId} rosterId={rosterId} />
          </div>
        )}
      </div>
    </TabDataState>
  )
}
