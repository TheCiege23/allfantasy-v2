'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { SportGroup, LeagueForGrouping } from '@/lib/dashboard'

export interface DashboardSportGroupsProps {
  groups: SportGroup[]
  maxPerGroup?: number
  emptyLeagueLabel?: string
  renderLeagueHref?: (league: LeagueForGrouping) => string
}

/**
 * DashboardSportGroups — visual grouping surface for leagues by sport.
 * Keeps emoji + sport section headers consistent across dashboard views.
 */
export function DashboardSportGroups({
  groups,
  maxPerGroup = 3,
  emptyLeagueLabel = 'Unnamed league',
  renderLeagueHref = (league) => `/leagues/${league.id}`,
}: DashboardSportGroupsProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.sport}>
          <h4 className="text-xs font-medium text-white/50 mb-2 flex items-center gap-1.5">
            <span>{group.emoji}</span>
            <span>{group.label}</span>
          </h4>
          <div className="space-y-2">
            {group.leagues.slice(0, maxPerGroup).map((league) => (
              <Link
                key={league.id}
                href={renderLeagueHref(league)}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] transition group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{league.name || emptyLeagueLabel}</div>
                  <div className="text-xs text-white/40">
                    {league.leagueSize ?? '?'}-team · {league.isDynasty ? 'Dynasty' : 'Redraft'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 shrink-0" />
              </Link>
            ))}
            {group.leagues.length > maxPerGroup && (
              <div className="text-xs text-white/40 py-1">+{group.leagues.length - maxPerGroup} more</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
