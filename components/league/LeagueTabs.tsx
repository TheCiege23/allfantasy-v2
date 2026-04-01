'use client'

import type { LeagueTopTab } from '@/components/league/types'

const TABS: LeagueTopTab[] = ['DRAFT', 'TEAM', 'PLAYERS', 'LEAGUE']

export default function LeagueTabs({
  activeTab,
  onChange,
  showTeamDot = false,
}: {
  activeTab: LeagueTopTab
  onChange: (tab: LeagueTopTab) => void
  showTeamDot?: boolean
}) {
  return (
    <div className="sticky top-[68px] z-30 border-b border-white/10 bg-[#0B0F1E]/95 px-4 pb-1 pt-1 backdrop-blur">
      <div className="grid grid-cols-4 gap-2">
        {TABS.map((tab) => {
          const isActive = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className="relative flex min-h-[44px] items-center justify-center"
            >
              <span className={`text-[15px] font-semibold tracking-wide ${isActive ? 'text-[#00D4AA]' : 'text-[#8B9DB8]'}`}>
                {tab}
              </span>
              {tab === 'TEAM' && showTeamDot ? (
                <span className="absolute right-4 top-2.5 h-2 w-2 rounded-full bg-[#EF4444]" />
              ) : null}
              {isActive ? <span className="absolute bottom-0 h-0.5 w-14 rounded-full bg-[#00D4AA]" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
