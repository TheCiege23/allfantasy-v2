'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import LeagueShell from '@/components/app/LeagueShell'
import LiveScoringWidget from '@/components/live/LiveScoringWidget'
import LeagueTabNav, { type LeagueShellTab, LEAGUE_SHELL_TABS } from '@/components/app/LeagueTabNav'
import OverviewTab from '@/components/app/tabs/OverviewTab'
import TeamTab from '@/components/app/tabs/TeamTab'
import { C2CTeamTab } from '@/components/merged-devy-c2c/C2CTeamTab'
import MatchupsTab from '@/components/app/tabs/MatchupsTab'
import RosterTab from '@/components/app/tabs/RosterTab'
import PlayersTab from '@/components/app/tabs/PlayersTab'
import WaiversTab from '@/components/app/tabs/WaiversTab'
import TradesTab from '@/components/app/tabs/TradesTab'
import DraftTab from '@/components/app/tabs/DraftTab'
import StandingsTab from '@/components/app/tabs/StandingsTab'
import PowerRankingsTab from '@/components/app/tabs/PowerRankingsTab'
import LeagueInfoTab from '@/components/app/tabs/LeagueInfoTab'
import LeagueChatTab from '@/components/app/tabs/LeagueChatTab'
import LeagueSettingsTab from '@/components/app/tabs/LeagueSettingsTab'
import CommissionerTab from '@/components/app/tabs/CommissionerTab'
import PreviousLeaguesTab from '@/components/app/tabs/PreviousLeaguesTab'
import IntelligenceTab from '@/components/app/tabs/IntelligenceTab'
import HallOfFameTab from '@/components/app/tabs/HallOfFameTab'
import LegacyTab from '@/components/app/tabs/LegacyTab'
import AdvisorTab from '@/components/app/tabs/AdvisorTab'
import CareerTab from '@/components/app/tabs/CareerTab'
import AwardsTab from '@/components/app/tabs/AwardsTab'
import RecordBooksTab from '@/components/app/tabs/RecordBooksTab'
import StoreTab from '@/components/app/tabs/StoreTab'
import NewsTab from '@/components/app/tabs/NewsTab'
import DivisionsTab from '@/components/app/tabs/DivisionsTab'
import { GuillotineFirstEntryModal } from '@/components/guillotine/GuillotineFirstEntryModal'
import { TournamentLeagueHome, TournamentTeamView } from '@/components/tournament'
import { useSession } from 'next-auth/react'
import { getLeagueTypeMedia, normalizeLeagueTypeKey } from '@/lib/league-media/leagueTypeMedia'
import EngagementEventTracker from '@/components/engagement/EngagementEventTracker'

type LeagueSummary = { id: string; name: string }

const VALID_TABS = new Set<LeagueShellTab>([
  'Overview', 'Team', 'Matchups', 'Roster', 'Players', 'Waivers', 'Trades', 'Draft',
  'Standings / Playoffs', 'Rankings', 'Divisions', 'League', 'News', 'Hall of Fame', 'Legacy', 'Career', 'Awards', 'Record Books', 'Store', 'Intelligence', 'Chat',
  'Advisor',
  'Settings', 'Commissioner', 'Previous Leagues',
])

export default function AppLeaguePage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ leagueId: string }>()
  const searchParams = useSearchParams()
  const leagueId = params?.leagueId || ''
  const tabParam = searchParams?.get('tab')
  const isValidInitialTab = tabParam ? VALID_TABS.has(tabParam as LeagueShellTab) : true
  const initialTab: LeagueShellTab | undefined =
    tabParam && isValidInitialTab ? (tabParam as LeagueShellTab) : undefined

  const [leagueName, setLeagueName] = useState<string>('League')
  const [isCommissioner, setIsCommissioner] = useState<boolean>(false)
  const [isGuillotine, setIsGuillotine] = useState<boolean>(false)
  const [isSalaryCap, setIsSalaryCap] = useState<boolean>(false)
  const [isSurvivor, setIsSurvivor] = useState<boolean>(false)
  const [isZombie, setIsZombie] = useState<boolean>(false)
  const [isDynasty, setIsDynasty] = useState<boolean>(false)
  const [isKeeper, setIsKeeper] = useState<boolean>(false)
  const [isBestBall, setIsBestBall] = useState<boolean>(false)
  const [isDevyDynasty, setIsDevyDynasty] = useState<boolean>(false)
  const [isMergedDevyC2C, setIsMergedDevyC2C] = useState<boolean>(false)
  const [isBigBrother, setIsBigBrother] = useState<boolean>(false)
  const [isIdp, setIsIdp] = useState<boolean>(false)
  const [leagueModeKey, setLeagueModeKey] = useState<string>('redraft')
  const [showFirstEntryModal, setShowFirstEntryModal] = useState<boolean>(false)
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''
  const leagueMedia = useMemo(() => getLeagueTypeMedia(leagueModeKey), [leagueModeKey])

  useEffect(() => {
    if (!tabParam || isValidInitialTab) return
    const nextParams = new URLSearchParams(searchParams?.toString() ?? '')
    nextParams.set('tab', 'Overview')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [isValidInitialTab, pathname, router, searchParams, tabParam])

  useEffect(() => {
    let active = true

    async function loadName() {
      if (!leagueId) return
      try {
        // Always fetch app league detail for name and leagueVariant (guillotine)
        const leagueRes = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}`, { cache: 'no-store' })
        if (active && leagueRes.ok) {
          const leagueData = await leagueRes.json().catch(() => ({})) as { name?: string; leagueVariant?: string; isDynasty?: boolean; leagueType?: string | null }
          if (leagueData?.name) setLeagueName(leagueData.name)
          setIsDynasty(!!leagueData?.isDynasty)
          const leagueType = String(leagueData?.leagueType ?? '').toLowerCase()
          setIsKeeper(leagueType === 'keeper')
          setIsBestBall(leagueType === 'best_ball')
          const variant = String(leagueData?.leagueVariant ?? '').toLowerCase()
          setIsGuillotine(variant === 'guillotine')
          setIsSalaryCap(variant === 'salary_cap')
          setShowFirstEntryModal(variant === 'guillotine')
          setIsSurvivor(variant === 'survivor')
          setIsZombie(variant === 'zombie')
          setIsDevyDynasty(variant === 'devy_dynasty')
          setIsMergedDevyC2C(variant === 'merged_devy_c2c')
          setIsBigBrother(variant === 'big_brother')
          setIsIdp(variant === 'idp' || variant === 'dynasty_idp')
          const resolvedMode = variant || leagueType || (leagueData?.isDynasty ? 'dynasty' : 'redraft')
          setLeagueModeKey(normalizeLeagueTypeKey(resolvedMode))
          return
        }
        // Fallback: bracket list
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

    void loadName()
    return () => {
      active = false
    }
  }, [leagueId])

  useEffect(() => {
    let active = true
    async function check() {
      if (!leagueId) return
      try {
        const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/check`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (active) setIsCommissioner(!!data.isCommissioner)
      } catch {
        if (active) setIsCommissioner(false)
      }
    }
    check()
    return () => {
      active = false
    }
  }, [leagueId])

  const tabs = useMemo(
    () => (isCommissioner ? ([...LEAGUE_SHELL_TABS.filter((t) => t !== 'Previous Leagues'), 'Commissioner', 'Previous Leagues'] as LeagueShellTab[]) : undefined),
    [isCommissioner]
  )

  const renderTab = useMemo(() => {
    return (tab: LeagueShellTab) => {
      if (tab === 'Overview') return <OverviewTab leagueId={leagueId} isGuillotine={isGuillotine} isSalaryCap={isSalaryCap} isSurvivor={isSurvivor} isZombie={isZombie} isDevyDynasty={isDevyDynasty} isMergedDevyC2C={isMergedDevyC2C} isBigBrother={isBigBrother} isIdp={isIdp} isCommissioner={isCommissioner} />
      if (tab === 'Team') return isMergedDevyC2C ? <C2CTeamTab leagueId={leagueId} /> : <TeamTab leagueId={leagueId} />
      if (tab === 'Matchups') return <MatchupsTab leagueId={leagueId} />
      if (tab === 'Roster') return <RosterTab leagueId={leagueId} />
      if (tab === 'Players') return <PlayersTab leagueId={leagueId} />
      if (tab === 'Waivers') return <WaiversTab leagueId={leagueId} />
      if (tab === 'Trades') return <TradesTab leagueId={leagueId} />
      if (tab === 'Draft') return <DraftTab leagueId={leagueId} />
      if (tab === 'Standings / Playoffs') return <StandingsTab leagueId={leagueId} />
      if (tab === 'Rankings') return <PowerRankingsTab leagueId={leagueId} />
      if (tab === 'Divisions') return <DivisionsTab leagueId={leagueId} isCommissioner={isCommissioner} />
      if (tab === 'League') return <LeagueInfoTab leagueId={leagueId} />
      if (tab === 'News') return <NewsTab leagueId={leagueId} isCommissioner={isCommissioner} />
      if (tab === 'Hall of Fame') return <HallOfFameTab leagueId={leagueId} />
      if (tab === 'Legacy') return <LegacyTab leagueId={leagueId} />
      if (tab === 'Advisor') return <AdvisorTab leagueId={leagueId} />
      if (tab === 'Career') return <CareerTab leagueId={leagueId} isCommissioner={isCommissioner} />
      if (tab === 'Awards') return <AwardsTab leagueId={leagueId} isCommissioner={isCommissioner} />
      if (tab === 'Record Books') return <RecordBooksTab leagueId={leagueId} isCommissioner={isCommissioner} />
      if (tab === 'Store') return <StoreTab leagueId={leagueId} />
      if (tab === 'Intelligence') return <IntelligenceTab leagueId={leagueId} />
      if (tab === 'Chat') return <LeagueChatTab leagueId={leagueId} />
      if (tab === 'Settings') return <LeagueSettingsTab leagueId={leagueId} isDynasty={isDynasty} isDevyDynasty={isDevyDynasty} isMergedDevyC2C={isMergedDevyC2C} isBigBrother={isBigBrother} isIdp={isIdp} isCommissioner={isCommissioner} />
      if (tab === 'Commissioner') return <CommissionerTab leagueId={leagueId} />
      return <PreviousLeaguesTab leagueId={leagueId} />
    }
  }, [leagueId, isGuillotine, isSalaryCap, isSurvivor, isZombie, isDynasty, isDevyDynasty, isMergedDevyC2C, isBigBrother, isIdp, isCommissioner])

  return (
    <div className="space-y-3">
      <EngagementEventTracker
        eventType="league_view"
        enabled={Boolean(leagueId)}
        oncePerDayKey={`league_view:${leagueId}`}
        meta={{ leagueId, product: "app" }}
      />
      {isGuillotine && (
        <GuillotineFirstEntryModal
          leagueId={leagueId}
          show={showFirstEntryModal}
          onClose={() => setShowFirstEntryModal(false)}
        />
      )}
      <div className="px-4 sm:px-0 space-y-3">
        <section className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-white/65">League intro</p>
          <p className="mt-1 text-sm text-white/85">{leagueMedia.label}</p>
          <video
            key={leagueMedia.introVideo}
            className="mt-3 h-48 w-full rounded-lg border border-white/10 bg-black object-cover"
            src={leagueMedia.introVideo}
            poster={leagueMedia.thumbnail}
            autoPlay
            loop
            muted
            playsInline
            controls
            onError={(event) => {
              const target = event.currentTarget
              target.poster = leagueMedia.thumbnailFallback
              target.removeAttribute('src')
              target.load()
            }}
          />
        </section>
        <TournamentLeagueHome leagueId={leagueId} />
        {userId && <TournamentTeamView leagueId={leagueId} userId={userId} />}
      </div>
      <div className="px-4 pt-3 sm:px-0">
        <LiveScoringWidget leagueId={leagueId} />
      </div>
      <LeagueShell
        leagueName={leagueName}
        initialTab={initialTab}
        renderTab={renderTab}
        tabs={tabs}
        leagueModeLabel={
          isIdp
            ? 'IDP'
            : isSalaryCap
              ? 'Salary Cap'
              : isBestBall
                ? 'Best Ball'
                : isKeeper
                  ? 'Keeper'
                  : isDevyDynasty
                    ? 'Devy'
                    : isMergedDevyC2C
                      ? 'C2C'
                      : !isDynasty && !isGuillotine && !isSurvivor && !isZombie && !isBigBrother
                        ? 'Redraft'
                        : isDynasty
                          ? 'Dynasty'
                          : undefined
        }
      />
    </div>
  )
}
