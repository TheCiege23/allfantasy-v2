'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import LeagueHeader from '@/components/league/LeagueHeader'
import LeagueTabs from '@/components/league/LeagueTabs'
import ChatBar from '@/components/league/ChatBar'
import BottomNav from '@/components/league/BottomNav'
import DraftTab from '@/components/league/tabs/DraftTab'
import TeamTab from '@/components/league/tabs/TeamTab'
import PlayersTab from '@/components/league/tabs/PlayersTab'
import LeagueTab from '@/components/league/tabs/LeagueTab'
import type { LeagueHomeData, LeagueTopTab } from '@/components/league/types'

const TOP_TABS: LeagueTopTab[] = ['DRAFT', 'TEAM', 'PLAYERS', 'LEAGUE']

function safeTab(value: string | null | undefined, fallback: LeagueTopTab): LeagueTopTab {
  if (!value) return fallback
  const upper = value.toUpperCase() as LeagueTopTab
  return TOP_TABS.includes(upper) ? upper : fallback
}

export default function LeagueHomeClient({
  data,
}: {
  data: LeagueHomeData
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<LeagueTopTab>(data.activeTab)

  const updateTab = useCallback(
    (tab: LeagueTopTab) => {
      setActiveTab(tab)
      const next = new URLSearchParams(searchParams?.toString() ?? '')
      next.set('tab', tab)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const resolvedTab = useMemo(() => safeTab(searchParams?.get('tab'), activeTab), [activeTab, searchParams])
  const needsTeamDot = data.roster.overRosterLimitBy > 0 || data.trades.activeTrades.length > 0

  return (
    <div className="min-h-screen bg-[#0B0F1E] text-white">
      <LeagueHeader league={data.league} />
      <LeagueTabs activeTab={resolvedTab} onChange={updateTab} showTeamDot={needsTeamDot} />

      <main className="mx-auto max-w-md px-4 pb-[148px] pt-5">
        {resolvedTab === 'DRAFT' ? (
          <DraftTab
            teams={data.teamsInDraftOrder}
            season={data.league.season}
            settingsItems={data.settingsItems}
            scoringSections={data.scoringSections}
            variant={data.variant}
            summaryCards={data.draftSummaryCards}
          />
        ) : null}

        {resolvedTab === 'TEAM' ? <TeamTab leagueId={data.league.id} roster={data.roster} variant={data.variant} /> : null}

        {resolvedTab === 'PLAYERS' ? (
          <PlayersTab leagueId={data.league.id} players={data.players} trades={data.trades} />
        ) : null}

        {resolvedTab === 'LEAGUE' ? (
          <LeagueTab
            leagueId={data.league.id}
            standings={data.standings}
            activity={data.activity}
            bracket={data.bracket}
          />
        ) : null}
      </main>

      <ChatBar chat={data.chat} />
      <BottomNav active="fantasy" />
    </div>
  )
}
