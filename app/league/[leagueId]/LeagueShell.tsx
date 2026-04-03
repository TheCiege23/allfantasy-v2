'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import type { League, LeagueInvite, LeagueTeam } from '@prisma/client'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { mapLeagueTeamsToSlots } from '@/lib/league/map-league-teams-to-slots'
import { LeftChatPanel } from '@/app/dashboard/components/LeftChatPanel'
import { RightControlPanel } from '@/app/dashboard/components/RightControlPanel'
import type { UserLeague } from '@/app/dashboard/types'
import { DraftTab } from './tabs/DraftTab'
import { TeamTab } from './tabs/TeamTab'
import { LeagueTab } from './tabs/LeagueTab'
import { PlayersTab } from './tabs/PlayersTab'
import { TrendTab } from './tabs/TrendTab'
import { TradesTab } from './tabs/TradesTab'
import { ScoresTab } from './tabs/ScoresTab'
import { HistoryTab } from './tabs/HistoryTab'
import { PlayerStatCard } from './components/PlayerStatCard'
import { LeagueSettingsModal } from './components/LeagueSettingsModal'

export type SleeperMemberMap = Record<string, { display_name: string; avatar: string | null }>

export type LeagueShellLeague = League & {
  teams: LeagueTeam[]
  invites: LeagueInvite[]
}

type LeagueShellTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores' | 'history'

const TABS: { id: LeagueShellTab; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'team', label: 'Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'history', label: 'History' },
]

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

function sportEmoji(sport: string): string {
  const u = sport.toUpperCase()
  if (u === 'NFL' || u === 'NCAAF') return '🏈'
  if (u === 'NBA' || u === 'NCAAB') return '🏀'
  if (u === 'MLB') return '⚾'
  if (u === 'NHL') return '🏒'
  if (u === 'SOCCER') return '⚽'
  return '🏟️'
}

export type LeagueShellProps = {
  league: LeagueShellLeague
  userTeam: LeagueTeam | null
  isOwner: boolean
  allLeagues: League[]
  userId: string
  userName: string
  userImage?: string | null
  draftDateIso: string | null
  sleeperCommissionerId: string | null
  sleeperUsersByPlatformId: SleeperMemberMap
  currentSleeperUserId: string | null
}

export function LeagueShell({
  league,
  userTeam,
  isOwner,
  allLeagues,
  userId,
  userName,
  userImage = null,
  draftDateIso,
  sleeperCommissionerId,
  sleeperUsersByPlatformId,
  currentSleeperUserId,
}: LeagueShellProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LeagueShellTab>('draft')
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

  const isSleeperCommissioner = Boolean(
    currentSleeperUserId &&
      sleeperCommissionerId &&
      currentSleeperUserId === sleeperCommissionerId,
  )

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
    <div className="flex h-screen overflow-hidden bg-[#07071a] text-white">
      <aside
        className="hidden h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#0a0a1f] md:flex"
        style={{ width: '45%', maxWidth: '420px', minWidth: '300px' }}
      >
        <LeftChatPanel
          selectedLeague={selectedLeague}
          activeLeagueId={league.id}
          userId={userId}
          userDisplayName={userName}
          userImage={userImage}
          rootId="league-left-chat"
          leagues={leagueList}
        />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <LeagueHeader
          league={selectedLeague}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenSettings={() => setSettingsOpen(true)}
          onGoHome={() => router.push('/dashboard')}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
          {activeTab === 'draft' && (
            <DraftTab
              league={selectedLeague}
              teams={teamSlots}
              isOwner={isOwner}
              inviteToken={inviteToken}
            />
          )}
          {activeTab === 'team' && (
            <TeamTab
              league={selectedLeague}
              userTeam={userTeam}
              onPlayerClick={handlePlayerClick}
              inviteToken={inviteToken}
            />
          )}
          {activeTab === 'league' && <LeagueTab league={selectedLeague} teams={teamSlots} />}
          {activeTab === 'players' && (
            <PlayersTab league={selectedLeague} onPlayerClick={handlePlayerClick} />
          )}
          {activeTab === 'trend' && (
            <TrendTab league={selectedLeague} onPlayerClick={handlePlayerClick} />
          )}
          {activeTab === 'trades' && (
            <TradesTab league={selectedLeague} teams={teamSlots} />
          )}
          {activeTab === 'scores' && <ScoresTab league={selectedLeague} />}
          {activeTab === 'history' && <HistoryTab league={selectedLeague} />}
        </div>
      </main>

      <aside className="hidden h-full min-w-0 overflow-hidden md:flex md:w-[200px] md:max-w-[200px] md:flex-shrink-0">
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
      </aside>

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
              isCommissioner={isSleeperCommissioner}
              sleeperMemberMap={sleeperUsersByPlatformId}
              onGoToDraftTab={() => {
                setSettingsOpen(false)
                setActiveTab('draft')
              }}
            />,
            document.body,
          )
        : null}
    </div>
  )
}

function LeagueHeader({
  league,
  activeTab,
  onTabChange,
  onOpenSettings,
  onGoHome,
}: {
  league: UserLeague
  activeTab: LeagueShellTab
  onTabChange: (t: LeagueShellTab) => void
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
          {sportEmoji(league.sport)}
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
        {TABS.map((tab) => (
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
