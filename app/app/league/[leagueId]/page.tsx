'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import LeagueShell from '@/components/app/LeagueShell'
import type { LeagueShellTab } from '@/components/app/LeagueTabNav'
import OverviewTab from '@/components/app/tabs/OverviewTab'
import TeamTab from '@/components/app/tabs/TeamTab'
import MatchupsTab from '@/components/app/tabs/MatchupsTab'
import RosterTab from '@/components/app/tabs/RosterTab'
import PlayersTab from '@/components/app/tabs/PlayersTab'
import WaiversTab from '@/components/app/tabs/WaiversTab'
import TradesTab from '@/components/app/tabs/TradesTab'
import DraftTab from '@/components/app/tabs/DraftTab'
import StandingsTab from '@/components/app/tabs/StandingsTab'
import LeagueInfoTab from '@/components/app/tabs/LeagueInfoTab'
import LeagueChatTab from '@/components/app/tabs/LeagueChatTab'
import LeagueSettingsTab from '@/components/app/tabs/LeagueSettingsTab'
import PreviousLeaguesTab from '@/components/app/tabs/PreviousLeaguesTab'

type LeagueSummary = { id: string; name: string }

export default function AppLeaguePage() {
  const params = useParams<{ leagueId: string }>()
  const leagueId = params?.leagueId || ''
  const [leagueName, setLeagueName] = useState<string>('League')

  useEffect(() => {
    let active = true

    async function loadName() {
      try {
        const res = await fetch('/api/bracket/my-leagues', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!active) return
        const leagues = Array.isArray(data?.leagues) ? (data.leagues as LeagueSummary[]) : []
        const hit = leagues.find((l) => l.id === leagueId)
        if (hit?.name) setLeagueName(hit.name)
      } catch {
        if (active) setLeagueName('League')
      }
    }

    if (leagueId) void loadName()
    return () => {
      active = false
    }
  }, [leagueId])

  const renderTab = useMemo(() => {
    return (tab: LeagueShellTab) => {
      if (tab === 'Overview') return <OverviewTab leagueId={leagueId} />
      if (tab === 'Team') return <TeamTab leagueId={leagueId} />
      if (tab === 'Matchups') return <MatchupsTab leagueId={leagueId} />
      if (tab === 'Roster') return <RosterTab leagueId={leagueId} />
      if (tab === 'Players') return <PlayersTab leagueId={leagueId} />
      if (tab === 'Waivers') return <WaiversTab leagueId={leagueId} />
      if (tab === 'Trades') return <TradesTab leagueId={leagueId} />
      if (tab === 'Draft') return <DraftTab leagueId={leagueId} />
      if (tab === 'Standings / Playoffs') return <StandingsTab leagueId={leagueId} />
      if (tab === 'League') return <LeagueInfoTab leagueId={leagueId} />
      if (tab === 'Chat') return <LeagueChatTab leagueId={leagueId} />
      if (tab === 'Settings') return <LeagueSettingsTab leagueId={leagueId} />
      return <PreviousLeaguesTab leagueId={leagueId} />
    }
  }, [leagueId])

  return <LeagueShell leagueName={leagueName} renderTab={renderTab} />
}
