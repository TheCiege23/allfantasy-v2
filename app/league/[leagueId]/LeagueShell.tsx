'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { CommissionerSettingsModal } from './components/CommissionerSettingsModal'
import { useIdpCapSummary, useRedraftRosterId } from '@/app/idp/hooks/useIdpTeamCap'
import { LeagueSettingsTab } from './tabs/LeagueSettingsTab'
import { RedraftTab } from './tabs/RedraftTab'
import { KeeperSelectionTab } from './tabs/KeeperSelectionTab'
import { BestBallTab } from './tabs/BestBallTab'
import { GuillotineTab } from './tabs/GuillotineTab'
import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'
import { c2cScoreModeChip, c2cSportPairShort } from '@/lib/c2c/c2cUiLabels'

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
    leagueVariant: l.leagueVariant ?? undefined,
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
  const searchParams = useSearchParams()
  const { rosterId: capRosterId } = useRedraftRosterId(league.id)
  const { summary: capSummary } = useIdpCapSummary(league.id, capRosterId)
  const idpCapEnabled = Boolean(capSummary)
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

  useEffect(() => {
    const view = searchParams.get('view')
    if (!view) return
    const map: Record<string, string> = {
      team: 'team',
      roster: 'team',
      matchup: 'scores',
      scores: 'scores',
      draft: 'draft',
      redraft: 'redraft',
      trades: 'trades',
    }
    const target = map[view]
    if (!target) return
    const ids = new Set(tabDefs.map((t) => t.id))
    if (ids.has(target)) setActiveTab(target)
  }, [searchParams, tabDefs])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [portalMounted, setPortalMounted] = useState(false)
  const [idpUi, setIdpUi] = useState<{ active: boolean; positionMode: string } | null>(null)
  const [idpViewMode, setIdpViewMode] = useState<'offense' | 'defense' | 'full'>('full')
  const [devyConfig, setDevyConfig] = useState<Record<string, unknown> | null | 'none'>(null)
  const [devyBucketStats, setDevyBucketStats] = useState({ active: 0, taxi: 0, devy: 0 })
  const [commissionerSettingsOpen, setCommissionerSettingsOpen] = useState(false)
  const [c2cConfig, setC2cConfig] = useState<C2CConfigClient | null>(null)
  const [c2cChecked, setC2cChecked] = useState(false)

  useEffect(() => {
    setPortalMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/c2c?leagueId=${encodeURIComponent(league.id)}`, { credentials: 'include' })
      .then((r) => {
        if (cancelled) return
        setC2cChecked(true)
        if (!r.ok) {
          setC2cConfig(null)
          return
        }
        return r.json().then((d: { c2c?: C2CConfigClient }) => {
          if (!cancelled) setC2cConfig(d.c2c ?? null)
        })
      })
      .catch(() => {
        if (!cancelled) {
          setC2cChecked(true)
          setC2cConfig(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [league.id])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/leagues/${encodeURIComponent(league.id)}/idp/config`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { config?: { positionMode?: string } } | null) => {
        if (cancelled) return
        if (d?.config) {
          setIdpUi({ active: true, positionMode: d.config.positionMode ?? 'standard' })
        } else {
          setIdpUi({ active: false, positionMode: 'standard' })
        }
      })
      .catch(() => {
        if (!cancelled) setIdpUi({ active: false, positionMode: 'standard' })
      })
    return () => {
      cancelled = true
    }
  }, [league.id])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/devy?leagueId=${encodeURIComponent(league.id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) return 'none' as const
        return r.ok ? r.json() : 'none' as const
      })
      .then((d) => {
        if (cancelled) return
        if (d === 'none') setDevyConfig('none')
        else if (d && typeof d === 'object' && 'config' in d && d.config)
          setDevyConfig(d.config as Record<string, unknown>)
        else setDevyConfig('none')
      })
      .catch(() => {
        if (!cancelled) setDevyConfig('none')
      })
    return () => {
      cancelled = true
    }
  }, [league.id])

  useEffect(() => {
    if (devyConfig === null || devyConfig === 'none') return
    let cancelled = false
    fetch(`/api/redraft/season?leagueId=${encodeURIComponent(league.id)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { season?: { rosters?: { id: string; ownerId: string | null }[] } } | null) => {
        const roster = data?.season?.rosters?.find((r) => r.ownerId === userId)
        if (!roster?.id) return null
        return fetch(
          `/api/devy/roster?leagueId=${encodeURIComponent(league.id)}&rosterId=${encodeURIComponent(roster.id)}`,
          { credentials: 'include' },
        )
      })
      .then((r) => (r && r.ok ? r.json() : null))
      .then(
        (d: {
          playerStates?: { bucketState: string }[]
          taxiSlots?: unknown[]
          devySlots?: unknown[]
        } | null) => {
          if (cancelled || !d) return
          const ps = d.playerStates ?? []
          const active = ps.filter((s) =>
            ['active_starter', 'active_bench', 'ir'].includes(s.bucketState),
          ).length
          setDevyBucketStats({
            active,
            taxi: (d.taxiSlots ?? []).length,
            devy: (d.devySlots ?? []).length,
          })
        },
      )
      .catch(() => {
        if (!cancelled) setDevyBucketStats({ active: 0, taxi: 0, devy: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [devyConfig, league.id, userId])

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
            leagueId={league.id}
            tabs={tabDefs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenSettings={() => setSettingsOpen(true)}
            onGoHome={() => router.push('/dashboard')}
            idpLeagueActive={idpUi?.active ?? false}
            idpViewMode={idpViewMode}
            onIdpViewModeChange={setIdpViewMode}
            devyLeagueActive={devyConfig !== null && devyConfig !== 'none'}
            devyBucketStats={devyBucketStats}
            c2cLeagueActive={c2cConfig !== null}
            c2cConfig={c2cConfig}
            isCommissioner={isCommissioner}
            onOpenCommissionerSettings={() => setCommissionerSettingsOpen(true)}
            idpCapEnabled={idpCapEnabled}
            capSummary={capSummary}
            capRosterId={capRosterId}
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
              idpLeagueActive={idpUi?.active ?? false}
              idpViewMode={idpViewMode}
              idpPositionMode={idpUi?.positionMode ?? 'standard'}
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

      {portalMounted &&
      isCommissioner &&
      ((devyConfig !== null && devyConfig !== 'none') || (c2cChecked && c2cConfig !== null))
        ? createPortal(
            <CommissionerSettingsModal
              leagueId={league.id}
              isOpen={commissionerSettingsOpen}
              onClose={() => setCommissionerSettingsOpen(false)}
            />,
            document.body,
          )
        : null}

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
  idpLeagueActive,
  idpViewMode,
  idpPositionMode,
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
  idpLeagueActive: boolean
  idpViewMode: 'offense' | 'defense' | 'full'
  idpPositionMode: string
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
          idpLeagueUi={idpLeagueActive}
        />
      )
    case 'redraft':
      return <RedraftTab leagueId={leagueId} idpLeagueUi={idpLeagueActive} />
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
          idpLeagueUi={idpLeagueActive}
          idpViewMode={idpViewMode}
          idpPositionMode={idpPositionMode}
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
      return (
        <ScoresTab league={selectedLeague} sport={sport} idpLeagueUi={idpLeagueActive} />
      )
    case 'history':
      return <HistoryTab league={selectedLeague} />
    case 'settings':
      return <LeagueSettingsTab leagueId={leagueId} />
    case 'standings':
      return (
        <StandingsTab league={selectedLeague} tabLabel={tabLabel} idpLeagueUi={idpLeagueActive} />
      )
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
  leagueId,
  tabs,
  activeTab,
  onTabChange,
  onOpenSettings,
  onGoHome,
  idpLeagueActive = false,
  idpViewMode = 'full',
  onIdpViewModeChange,
  devyLeagueActive = false,
  devyBucketStats = { active: 0, taxi: 0, devy: 0 },
  c2cLeagueActive = false,
  c2cConfig = null,
  isCommissioner = false,
  onOpenCommissionerSettings,
  idpCapEnabled = false,
  capSummary = null,
  capRosterId = null,
}: {
  league: UserLeague
  leagueId: string
  tabs: TabDef[]
  activeTab: string
  onTabChange: (t: string) => void
  onOpenSettings: () => void
  onGoHome: () => void
  idpLeagueActive?: boolean
  idpViewMode?: 'offense' | 'defense' | 'full'
  onIdpViewModeChange?: (m: 'offense' | 'defense' | 'full') => void
  devyLeagueActive?: boolean
  devyBucketStats?: { active: number; taxi: number; devy: number }
  c2cLeagueActive?: boolean
  c2cConfig?: C2CConfigClient | null
  isCommissioner?: boolean
  onOpenCommissionerSettings?: () => void
  idpCapEnabled?: boolean
  capSummary?: {
    totalCap: number
    availableCap: number
  } | null
  capRosterId?: string | null
}) {
  const capPct =
    capSummary && capSummary.totalCap > 0 ? capSummary.availableCap / capSummary.totalCap : 0
  const capPillClass =
    capPct > 0.3
      ? 'border-[color:var(--cap-green)]/50 bg-[color:var(--cap-green)]/15 text-emerald-100'
      : capPct > 0.1
        ? 'border-[color:var(--cap-amber)]/45 bg-[color:var(--cap-amber)]/15 text-amber-100'
        : 'border-[color:var(--cap-red)]/45 bg-[color:var(--cap-red)]/15 text-red-100'
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
            {idpLeagueActive ? (
              <span className="idp-creator-badge flex-shrink-0 whitespace-nowrap">✦ Created by TheCiege</span>
            ) : null}
            {c2cLeagueActive && c2cConfig ? (
              <>
                {c2cConfig.createdByTheCiege !== false ? (
                  <span className="c2c-creator-badge flex-shrink-0 whitespace-nowrap" data-testid="c2c-creator-badge">
                    ✦ Created by TheCiege
                  </span>
                ) : null}
                <span
                  className="flex h-6 flex-shrink-0 items-stretch overflow-hidden rounded-full border border-white/[0.12] text-[9px] font-bold uppercase tracking-wide"
                  data-testid="c2c-sport-pair-pill"
                  title={c2cSportPairShort(c2cConfig.sportPair).label}
                >
                  <span className="flex items-center bg-violet-600/45 px-2 text-violet-50">
                    {c2cSportPairShort(c2cConfig.sportPair).left}
                  </span>
                  <span className="flex items-center px-1 text-white/50">↔</span>
                  <span className="flex items-center bg-blue-600/45 px-2 text-blue-50">
                    {c2cSportPairShort(c2cConfig.sportPair).right}
                  </span>
                </span>
                <span
                  className="flex-shrink-0 rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90"
                  style={{
                    background: 'linear-gradient(90deg, rgba(124,58,237,0.35), rgba(37,99,235,0.35))',
                  }}
                  data-testid="c2c-dynasty-pill"
                >
                  Dynasty · C2C
                </span>
              </>
            ) : null}
            {devyLeagueActive ? (
              <>
                <span
                  className="devy-creator-badge flex-shrink-0 whitespace-nowrap"
                  data-testid="devy-creator-badge"
                >
                  ✦ Created by TheCiege
                </span>
                <span
                  className="flex-shrink-0 rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90"
                  style={{
                    background: 'linear-gradient(90deg, rgba(124,58,237,0.35), rgba(37,99,235,0.35))',
                  }}
                  data-testid="devy-dynasty-pill"
                >
                  Dynasty · Devy
                </span>
              </>
            ) : null}
            <span className="flex-shrink-0 text-[11px] text-white/40">
              {league.season} {league.teamCount}-Team {league.isDynasty ? 'Dynasty' : 'Redraft'}{' '}
              {league.scoring}
            </span>
          </div>
          {idpLeagueActive && onIdpViewModeChange ? (
            <div className="mt-2 flex max-w-md flex-wrap gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1">
              {(['offense', 'defense', 'full'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onIdpViewModeChange(m)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
                    idpViewMode === m
                      ? m === 'offense'
                        ? 'bg-[color:var(--idp-offense)]/25 text-blue-100'
                        : m === 'defense'
                          ? 'bg-[color:var(--idp-defense)]/25 text-red-100'
                          : 'bg-[color:var(--idp-combined)]/25 text-violet-100'
                      : 'text-white/45 hover:bg-white/[0.04]'
                  }`}
                  data-testid={`idp-view-${m}`}
                >
                  {m === 'full' ? 'Full team' : m}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {c2cLeagueActive && c2cConfig ? (
            <span
              className="whitespace-nowrap rounded-full border border-violet-500/35 bg-violet-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-violet-100"
              data-testid="c2c-score-mode-chip"
            >
              {c2cScoreModeChip(c2cConfig)}
            </span>
          ) : null}
          {idpCapEnabled && capSummary && capRosterId ? (
            <Link
              href={`/idp/cap/${leagueId}?rosterId=${encodeURIComponent(capRosterId)}`}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide transition hover:brightness-110 ${capPillClass}`}
              data-testid="idp-cap-header-pill"
            >
              CAP: ${capSummary.availableCap.toFixed(1)}M
            </Link>
          ) : null}
          {devyLeagueActive ? (
            <div
              className="flex max-w-[200px] flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[9px] font-semibold text-white/70 sm:max-w-none sm:text-[10px]"
              data-testid="devy-bucket-stats"
            >
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--devy-active)' }} />
                {devyBucketStats.active} NFL
              </span>
              <span className="text-white/25">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--devy-taxi)' }} />
                {devyBucketStats.taxi} Taxi
              </span>
              <span className="text-white/25">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--devy-devy)' }} />
                {devyBucketStats.devy} Devy
              </span>
            </div>
          ) : null}
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

      {idpLeagueActive && idpCapEnabled && capRosterId ? (
        <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto border-t border-white/[0.05] px-5 py-2">
          {(
            [
              ['Roster', `/league/${leagueId}?view=team`],
              ['Matchup', `/league/${leagueId}?view=scores`],
              ['Contracts', `/idp/contracts/${leagueId}?rosterId=${encodeURIComponent(capRosterId)}`],
              ['Defense Hub', `/idp/defense-hub/${leagueId}?rosterId=${encodeURIComponent(capRosterId)}`],
              ['Cap Room', `/idp/cap/${leagueId}?rosterId=${encodeURIComponent(capRosterId)}`],
              ['Chat', `/league/${leagueId}`],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-cyan-200/90 transition-colors hover:bg-cyan-500/10"
              data-testid={`idp-cap-quick-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {label}
            </Link>
          ))}
        </div>
      ) : null}

      {c2cLeagueActive ? (
        <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto border-t border-white/[0.05] px-5 py-2">
          {(
            [
              ['Roster', `/c2c/${leagueId}/roster`],
              ['Campus', `/c2c/${leagueId}/campus`],
              ['Canton', `/c2c/${leagueId}/canton`],
              ['Matchup', `/c2c/${leagueId}/matchup`],
              ['Picks', `/c2c/${leagueId}/picks`],
              ['Chat', `/league/${leagueId}`],
              ['History', `/league/${leagueId}?view=history`],
              ['Commissioner', '__commish__'],
            ] as const
          ).map(([label, href]) =>
            href === '__commish__' ? (
              <button
                key={`c2c-${label}`}
                type="button"
                onClick={() => {
                  if (isCommissioner && onOpenCommissionerSettings) onOpenCommissionerSettings()
                  else onOpenSettings()
                }}
                className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                data-testid={`c2c-quick-${label.toLowerCase()}`}
              >
                {label}
              </button>
            ) : (
              <Link
                key={`c2c-${label}`}
                href={href}
                className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-cyan-200/90 transition-colors hover:bg-cyan-500/10"
                data-testid={`c2c-quick-${label.toLowerCase()}`}
              >
                {label}
              </Link>
            ),
          )}
        </div>
      ) : null}

      {devyLeagueActive ? (
        <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto border-t border-white/[0.05] px-5 py-2">
          {(
            [
              ['Roster', `/devy/${leagueId}/roster`],
              ['Taxi', `/devy/${leagueId}/roster#taxi`],
              ['Devy', `/devy/${leagueId}/roster#devy`],
              ['Picks', `/devy/${leagueId}/picks`],
              ['Matchup', `/league/${leagueId}`],
              ['Chat', `/league/${leagueId}`],
              ['History', `/devy/${leagueId}/history`],
              ['Commissioner', '__commish__'],
            ] as const
          ).map(([label, href]) =>
            href === '__commish__' ? (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (isCommissioner && onOpenCommissionerSettings) onOpenCommissionerSettings()
                  else onOpenSettings()
                }}
                className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                data-testid={`devy-quick-${label.toLowerCase()}`}
              >
                {label}
              </button>
            ) : (
              <Link
                key={label}
                href={href}
                className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-cyan-200/90 transition-colors hover:bg-cyan-500/10"
                data-testid={`devy-quick-${label.toLowerCase()}`}
              >
                {label}
              </Link>
            ),
          )}
        </div>
      ) : null}

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
