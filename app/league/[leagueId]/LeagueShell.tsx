'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import type { League, LeagueInvite, LeagueTeam } from '@prisma/client'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { mapLeagueTeamsToSlots } from '@/lib/league/map-league-teams-to-slots'
import AppShell from '@/app/components/AppShell'
import { LeftChatPanel } from '@/app/dashboard/components/LeftChatPanel'
import { RightControlPanel } from '@/app/dashboard/components/RightControlPanel'
import type { UserLeague, UserLeagueTeam } from '@/app/dashboard/types'
import { getLeagueTabs, leagueTabSportEmoji, type TabDef } from './LeagueTabs'
import { DraftTab } from './tabs/DraftTab'
import { TeamTab } from './tabs/TeamTab'
import { LeagueTab } from './tabs/LeagueTab'
import { PlayersTab } from './tabs/PlayersTab'
import { TrendTab } from './tabs/TrendTab'
import { TradesTab } from './tabs/TradesTab'
import { ScoresTab } from './tabs/ScoresTab'
import { HistoryTab } from './tabs/HistoryTab'
import { StandingsTab } from './tabs/StandingsTab'
import { FixturesTab } from './tabs/FixturesTab'
import { TransfersTab } from './tabs/TransfersTab'
import { TableTab } from './tabs/TableTab'
import { LeaderboardTab } from './tabs/LeaderboardTab'
import { MyPicksTab } from './tabs/MyPicksTab'
import { ScheduleTab } from './tabs/ScheduleTab'
import { LeagueTabPlaceholder } from './tabs/LeagueTabPlaceholder'
import { PlayerStatCard } from './components/PlayerStatCard'
import { LeagueSettingsModal } from './components/LeagueSettingsModal'
import { LeagueSettingsTab } from './tabs/LeagueSettingsTab'
import { RedraftTab } from './tabs/RedraftTab'
import { KeeperSelectionTab } from './tabs/KeeperSelectionTab'
import { BestBallTab } from './tabs/BestBallTab'
import { GuillotineTab } from './tabs/GuillotineTab'

export type SleeperMemberMap = Record<string, { display_name: string; avatar: string | null }>

export type LeagueShellLeague = League & {
  teams: LeagueTeam[]
  invites: LeagueInvite[]
}

function weekFromLeagueSettings(settings: unknown): number | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const o = settings as Record<string, unknown>
  const w = o.currentWeek ?? o.current_week ?? o.week
  if (typeof w === 'number' && Number.isFinite(w)) return w
  if (typeof w === 'string') {
    const n = parseInt(w, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function prismaLeagueToUserLeague(
  l: League,
  extra?: { draftDate?: string | null },
): UserLeague {
  const sport = normalizeToSupportedSport(String(l.sport)) ?? DEFAULT_SPORT
  const settings = (l.settings as Record<string, unknown> | undefined) ?? undefined
  return {
    id: l.id,
    name: l.name ?? 'League',
    platform: l.platform,
    sport,
    format: l.leagueVariant ?? (l.isDynasty ? 'dynasty' : 'redraft'),
    scoring: l.scoring ?? 'Standard',
    teamCount: l.leagueSize ?? 10,
    season: l.season ?? new Date().getFullYear(),
    status: l.status ?? undefined,
    currentWeek: weekFromLeagueSettings(l.settings) ?? undefined,
    isDynasty: l.isDynasty,
    settings,
    avatarUrl: l.avatarUrl ?? undefined,
    sleeperLeagueId: l.platform === 'sleeper' ? l.platformLeagueId : undefined,
    draftDate: extra?.draftDate ?? undefined,
  }
}

export type LeagueShellProps = {
  league: LeagueShellLeague
  userTeam: LeagueTeam | null
  isOwner: boolean
  /** Head commissioner or co-commissioner — controls ⚙ Settings tab. */
  isCommissioner: boolean
  /** Head commissioner only (reset draft, co-comm management). */
  isHeadCommissioner: boolean
  allLeagues: League[]
  userId: string
  userName: string
  userImage?: string | null
  draftDateIso: string | null
  sleeperCommissionerId: string | null
  sleeperUsersByPlatformId: SleeperMemberMap
  currentSleeperUserId: string | null
  discordConnected?: boolean
  /** Deep-link prefill for league chat composer (`?zombieChimmy=`). */
  zombieChimmyPrefill?: string | null
}

export function LeagueShell({
  league,
  userTeam,
  isOwner,
  isCommissioner,
  isHeadCommissioner,
  allLeagues,
  userId,
  userName,
  userImage = null,
  draftDateIso,
  sleeperCommissionerId,
  sleeperUsersByPlatformId,
  currentSleeperUserId,
  discordConnected = false,
  zombieChimmyPrefill = null,
}: LeagueShellProps) {
  const router = useRouter()
  const tabDefs = useMemo(() => {
    let base = getLeagueTabs(String(league.sport))
    if (league.bestBallMode) {
      const idx = base.findIndex((t) => t.id === 'redraft')
      const bb = { id: 'bestball', label: 'Best Ball' }
      base = idx >= 0 ? [...base.slice(0, idx + 1), bb, ...base.slice(idx + 1)] : [bb, ...base]
    }
    if (league.guillotineMode) {
      const idx = base.findIndex((t) => t.id === 'redraft')
      const g = { id: 'guillotine', label: 'Guillotine' }
      base = idx >= 0 ? [...base.slice(0, idx + 1), g, ...base.slice(idx + 1)] : [g, ...base]
    }
    if (league.leagueType === 'keeper' && league.keeperPhaseActive) {
      base = [{ id: 'keeper', label: 'Keepers' }, ...base]
    }
    if (isCommissioner) {
      return [...base, { id: 'settings', label: '⚙ Settings' }]
    }
    return base
  }, [
    league.sport,
    league.leagueType,
    league.keeperPhaseActive,
    league.bestBallMode,
    league.guillotineMode,
    isCommissioner,
  ])
  const [activeTab, setActiveTab] = useState<string>(() => tabDefs[0]?.id ?? 'draft')

  useEffect(() => {
    const ids = new Set(tabDefs.map((t) => t.id))
    setActiveTab((prev) => (ids.has(prev) ? prev : tabDefs[0]?.id ?? 'draft'))
  }, [tabDefs])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [portalMounted, setPortalMounted] = useState(false)

  useEffect(() => {
    setPortalMounted(true)
  }, [])

  const selectedLeague = useMemo(
    () => prismaLeagueToUserLeague(league, { draftDate: draftDateIso }),
    [league, draftDateIso],
  )

  const teamSlots = useMemo(() => {
    const base = mapLeagueTeamsToSlots(league.teams, league.settings)
    if (league.platform !== 'sleeper') return base
    return base.map((slot) => {
      const pid = slot.platformUserId
      if (!pid) return slot
      const su = sleeperUsersByPlatformId[pid]
      if (!su?.avatar) return slot
      return { ...slot, avatarUrl: su.avatar }
    })
  }, [league.platform, league.teams, league.settings, sleeperUsersByPlatformId])

  const leagueList: UserLeague[] = useMemo(
    () => allLeagues.map((l) => prismaLeagueToUserLeague(l)),
    [allLeagues],
  )

  const inviteToken = league.invites[0]?.token

  const handleLeagueSelect = (l: UserLeague | null) => {
    if (l && l.id !== league.id) {
      router.push(`/league/${l.id}`)
    } else if (!l) {
      router.push('/dashboard')
    }
  }

  const handleImport = () => {
    router.push('/import')
  }

  const handlePlayerClick = (playerId: string) => setSelectedPlayer(playerId)
  const closePlayerCard = () => setSelectedPlayer(null)

  return (
    <>
      <AppShell
        leftPanel={
          <LeftChatPanel
            selectedLeague={selectedLeague}
            activeLeagueId={league.id}
            userId={userId}
            userDisplayName={userName}
            userImage={userImage}
            rootId="league-left-chat"
            leagues={leagueList}
            discordConnected={discordConnected}
            zombieChimmyPrefill={zombieChimmyPrefill}
          />
        }
        rightPanel={
          <RightControlPanel
            leagues={leagueList}
            leaguesLoading={false}
            selectedId={league.id}
            activeLeagueId={league.id}
            onSelectLeague={handleLeagueSelect}
            userId={userId}
            userName={userName}
            userImage={userImage}
            onImport={handleImport}
          />
        }
      >
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <LeagueHeader
            league={selectedLeague}
            tabs={tabDefs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenSettings={() => setSettingsOpen(true)}
            onGoHome={() => router.push('/dashboard')}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
            <LeagueTabRouter
              activeTab={activeTab}
              tabDefs={tabDefs}
              leagueId={league.id}
              selectedLeague={selectedLeague}
              userTeam={userTeam}
              teamSlots={teamSlots}
              inviteToken={inviteToken}
              isOwner={isOwner}
              onPlayerClick={handlePlayerClick}
            />
          </div>
        </main>
      </AppShell>

      {selectedPlayer ? (
        <PlayerStatCard
          playerId={selectedPlayer}
          leagueId={league.id}
          sport={selectedLeague.sport}
          onClose={closePlayerCard}
        />
      ) : null}

      {portalMounted
        ? createPortal(
            <LeagueSettingsModal
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              league={league}
              displayLeague={selectedLeague}
              userId={userId}
              userTeam={userTeam}
              sleeperLeagueId={league.platform === 'sleeper' ? league.platformLeagueId ?? null : null}
              isCommissioner={isCommissioner}
              isHeadCommissioner={isHeadCommissioner}
              sleeperMemberMap={sleeperUsersByPlatformId}
              onGoToDraftTab={() => {
                setSettingsOpen(false)
                const ids = tabDefs.map((t) => t.id)
                setActiveTab(ids.includes('draft') ? 'draft' : ids[0] ?? 'draft')
              }}
            />,
            document.body,
          )
        : null}
    </>
  )
}

function LeagueTabRouter({
  activeTab,
  tabDefs,
  leagueId,
  selectedLeague,
  userTeam,
  teamSlots,
  inviteToken,
  isOwner,
  onPlayerClick,
}: {
  activeTab: string
  tabDefs: TabDef[]
  leagueId: string
  selectedLeague: UserLeague
  userTeam: LeagueTeam | null
  teamSlots: UserLeagueTeam[]
  inviteToken: string | undefined
  isOwner: boolean
  onPlayerClick: (playerId: string) => void
}) {
  const tab = tabDefs.find((t) => t.id === activeTab)
  const tabLabel = tab?.label ?? activeTab
  const sport = selectedLeague.sport

  switch (activeTab) {
    case 'draft':
      return (
        <DraftTab
          league={selectedLeague}
          teams={teamSlots}
          isOwner={isOwner}
          inviteToken={inviteToken}
        />
      )
    case 'redraft':
      return <RedraftTab leagueId={leagueId} />
    case 'bestball':
      return <BestBallTab leagueId={leagueId} sport={sport} />
    case 'guillotine':
      return <GuillotineTab leagueId={leagueId} sport={sport} />
    case 'keeper':
      return <KeeperSelectionTab leagueId={leagueId} />
    case 'team':
    case 'roster':
    case 'squad':
      return (
        <TeamTab
          league={selectedLeague}
          userTeam={userTeam}
          onPlayerClick={onPlayerClick}
          inviteToken={inviteToken}
          sport={sport}
        />
      )
    case 'league':
      return <LeagueTab league={selectedLeague} teams={teamSlots} />
    case 'players':
      return <PlayersTab league={selectedLeague} onPlayerClick={onPlayerClick} sport={sport} />
    case 'trend':
      return <TrendTab league={selectedLeague} onPlayerClick={onPlayerClick} sport={sport} />
    case 'trades':
      return <TradesTab league={selectedLeague} teams={teamSlots} />
    case 'scores':
      return <ScoresTab league={selectedLeague} sport={sport} />
    case 'history':
      return <HistoryTab league={selectedLeague} />
    case 'settings':
      return <LeagueSettingsTab leagueId={leagueId} />
    case 'standings':
      return <StandingsTab league={selectedLeague} tabLabel={tabLabel} />
    case 'fixtures':
      return <FixturesTab league={selectedLeague} tabLabel={tabLabel} />
    case 'transfers':
      return <TransfersTab league={selectedLeague} tabLabel={tabLabel} />
    case 'table':
      return <TableTab league={selectedLeague} tabLabel={tabLabel} />
    case 'leaderboard':
      return <LeaderboardTab league={selectedLeague} tabLabel={tabLabel} />
    case 'my-picks':
      return <MyPicksTab league={selectedLeague} tabLabel={tabLabel} />
    case 'schedule':
      return <ScheduleTab league={selectedLeague} tabLabel={tabLabel} />
    default:
      return <LeagueTabPlaceholder league={selectedLeague} tabLabel={tabLabel} />
  }
}

function LeagueHeader({
  league,
  tabs,
  activeTab,
  onTabChange,
  onOpenSettings,
  onGoHome,
}: {
  league: UserLeague
  tabs: TabDef[]
  activeTab: string
  onTabChange: (t: string) => void
  onOpenSettings: () => void
  onGoHome: () => void
}) {
  return (
    <div className="flex-shrink-0 border-b border-white/[0.07] bg-[#0c0c1e]">
      <div className="flex items-center gap-3 px-5 pb-0 pt-4">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-base"
          style={{ background: 'linear-gradient(135deg, #1e3a5f, #0e4a6e)' }}
        >
          {leagueTabSportEmoji(league.sport)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[15px] font-bold text-white">{league.name}</h1>
            <span className="flex-shrink-0 text-[11px] text-white/40">
              {league.season} {league.teamCount}-Team {league.isDynasty ? 'Dynasty' : 'Redraft'}{' '}
              {league.scoring}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onGoHome}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            aria-label="Dashboard home"
            data-testid="league-header-home"
          >
            <Home className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg p-1.5 text-lg leading-none text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            aria-label="League settings"
            data-testid="league-header-settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="scrollbar-none mt-2 flex overflow-x-auto px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-[12px] font-semibold transition-all ${
              activeTab === tab.id
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
