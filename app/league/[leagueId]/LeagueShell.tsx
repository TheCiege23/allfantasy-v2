'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { League, LeagueInvite, LeagueTeam } from '@prisma/client'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { mapLeagueTeamsToSlots } from '@/lib/league/map-league-teams-to-slots'
import { LeftChatPanel } from '@/app/dashboard/components/LeftChatPanel'
import { RightControlPanel } from '@/app/dashboard/components/RightControlPanel'
import { DASHBOARD_LEFT_PANEL_WIDTH } from '@/app/dashboard/types'
import type { UserLeague } from '@/app/dashboard/types'
import { DraftTab } from './tabs/DraftTab'
import { TeamTab } from './tabs/TeamTab'
import { LeagueTab } from './tabs/LeagueTab'
import { PlayersTab } from './tabs/PlayersTab'
import { TrendTab } from './tabs/TrendTab'
import { TradesTab } from './tabs/TradesTab'
import { ScoresTab } from './tabs/ScoresTab'
import { PlayerStatCard } from './components/PlayerStatCard'

export type LeagueShellLeague = League & {
  teams: LeagueTeam[]
  invites: LeagueInvite[]
}

type LeagueShellTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores'

const TABS: { id: LeagueShellTab; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'team', label: 'Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
]

function prismaLeagueToUserLeague(
  l: League,
  extra?: { draftDate?: string | null },
): UserLeague {
  const sport = normalizeToSupportedSport(String(l.sport)) ?? DEFAULT_SPORT
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
    isDynasty: l.isDynasty,
    settings: (l.settings as Record<string, unknown> | undefined) ?? undefined,
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
  draftDateIso: string | null
}

export function LeagueShell({
  league,
  userTeam,
  isOwner,
  allLeagues,
  userId,
  userName: _userName,
  draftDateIso,
}: LeagueShellProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LeagueShellTab>('draft')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  const selectedLeague = useMemo(
    () => prismaLeagueToUserLeague(league, { draftDate: draftDateIso }),
    [league, draftDateIso],
  )

  const teamSlots = useMemo(
    () => mapLeagueTeamsToSlots(league.teams, league.settings),
    [league.teams, league.settings],
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
      <aside className="hidden h-full min-h-0 md:flex" style={{ width: DASHBOARD_LEFT_PANEL_WIDTH }}>
        <LeftChatPanel
          selectedLeague={selectedLeague}
          userId={userId}
          width={DASHBOARD_LEFT_PANEL_WIDTH}
          rootId="league-left-chat"
          leagues={leagueList}
        />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <LeagueHeader
          league={selectedLeague}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOwner={isOwner}
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
        </div>
      </main>

      <aside className="hidden h-full min-w-0 overflow-hidden md:flex md:w-[300px] md:max-w-[300px] md:flex-shrink-0">
        <RightControlPanel
          leagues={leagueList}
          leaguesLoading={false}
          selectedId={league.id}
          onSelectLeague={handleLeagueSelect}
          userId={userId}
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
    </div>
  )
}

function LeagueHeader({
  league,
  activeTab,
  onTabChange,
  isOwner,
}: {
  league: UserLeague
  activeTab: LeagueShellTab
  onTabChange: (t: LeagueShellTab) => void
  isOwner: boolean
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
        {isOwner ? (
          <button
            type="button"
            className="text-lg text-white/30 transition-colors hover:text-white/60"
            aria-label="League settings"
          >
            ⚙️
          </button>
        ) : null}
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
