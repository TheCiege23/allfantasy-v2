'use client'

/**
 * CommissionerLeagueSettingsShell.tsx
 * Sleeper-style commissioner settings shell with left sidebar navigation.
 * Sidebar: plain text links, cyan active state, no icons — exact Sleeper match.
 * All 14 tabs: League, Team, Roster, Scoring, Draft, Draft Results, Playoff,
 * Division, Member, Co-owner, Commissioner Control, Dues, Previous Leagues, Delete.
 */

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { DeleteLeagueFromAfPanel } from './DeleteLeagueFromAfPanel'
import { LeagueRulesSummarySection } from './LeagueRulesSummarySection'
import { ScoringSettingsFullSection } from './ScoringSettingsFullSection'
import { SettingsSubPanelBody, type SubPanelContext } from './LeagueSettingsSubPanels'
import { NflScoringSettingsPanel } from '@/components/league-settings/NflScoringSettingsPanel'
import { NbaScoringSettingsPanel } from '@/components/league-settings/NbaScoringSettingsPanel'
import { NcaabScoringSettingsPanel } from '@/components/league-settings/NcaabScoringSettingsPanel'
import { MlbScoringSettingsPanel } from '@/components/league-settings/MlbScoringSettingsPanel'
import { NhlScoringSettingsPanel } from '@/components/league-settings/NhlScoringSettingsPanel'
import { NcaafScoringSettingsPanel } from '@/components/league-settings/NcaafScoringSettingsPanel'
import { SoccerScoringSettingsPanel } from '@/components/league-settings/SoccerScoringSettingsPanel'
import { DraftSettingsCommissionerPanel } from '@/components/league-settings/DraftSettingsCommissionerPanel'
import { DivisionSettingsCommissionerPanel } from '@/components/league-settings/DivisionSettingsCommissionerPanel'
import { MemberSettingsCommissionerPanel } from '@/components/league-settings/MemberSettingsCommissionerPanel'
import { CoOwnerSettingsPanel } from '@/components/league-settings/CoOwnerSettingsPanel'
import { CommissionerControlPanel } from '@/components/league-settings/CommissionerControlPanel'
import { LeagueHistoryPanel } from '@/components/league-settings/LeagueHistoryPanel'
import { LeagueDuesTrackerPanel } from '@/components/league-settings/LeagueDuesTrackerPanel'
import { DevyLeagueSettingsHub } from '@/components/devy/settings/DevyLeagueSettingsHub'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommissionerSectionId =
  | 'league'
  | 'devy'
  | 'team'
  | 'roster'
  | 'scoring'
  | 'draft'
  | 'draftResults'
  | 'playoffs'
  | 'divisions'
  | 'members'
  | 'coowners'
  | 'commissioner'
  | 'dues'
  | 'history'
  | 'delete'

// ---------------------------------------------------------------------------
// NAV — all 14 tabs, text-only sidebar matching Sleeper
// ---------------------------------------------------------------------------

// Nav items use translation key suffixes — resolved at render via t()
const NAV_IDS: { id: CommissionerSectionId; labelKey: string; subtitleKey: string }[] = [
  { id: 'league', labelKey: 'commish.nav.leagueSettings', subtitleKey: 'commish.subtitle.leagueSettings' },
  { id: 'devy', labelKey: 'commish.nav.devyHq', subtitleKey: 'commish.subtitle.devyHq' },
  { id: 'team', labelKey: 'commish.nav.teamSettings', subtitleKey: 'commish.subtitle.teamSettings' },
  { id: 'roster', labelKey: 'commish.nav.rosterSettings', subtitleKey: 'commish.subtitle.rosterSettings' },
  { id: 'scoring', labelKey: 'commish.nav.scoringSettings', subtitleKey: 'commish.subtitle.scoringSettings' },
  { id: 'draft', labelKey: 'commish.nav.draftSettings', subtitleKey: 'commish.subtitle.draftSettings' },
  { id: 'draftResults', labelKey: 'commish.nav.draftResults', subtitleKey: 'commish.subtitle.draftResults' },
  { id: 'playoffs', labelKey: 'commish.nav.playoffSettings', subtitleKey: 'commish.subtitle.playoffSettings' },
  { id: 'divisions', labelKey: 'commish.nav.divisionSettings', subtitleKey: 'commish.subtitle.divisionSettings' },
  { id: 'members', labelKey: 'commish.nav.memberSettings', subtitleKey: 'commish.subtitle.memberSettings' },
  { id: 'coowners', labelKey: 'commish.nav.coownerSettings', subtitleKey: 'commish.subtitle.coownerSettings' },
  { id: 'commissioner', labelKey: 'commish.nav.commissionerControl', subtitleKey: 'commish.subtitle.commissionerControl' },
  { id: 'dues', labelKey: 'commish.nav.duesTracker', subtitleKey: 'commish.subtitle.duesTracker' },
  { id: 'history', labelKey: 'commish.nav.leagueHistory', subtitleKey: 'commish.subtitle.leagueHistory' },
  { id: 'delete', labelKey: 'commish.nav.deleteLeague', subtitleKey: 'commish.subtitle.deleteLeague' },
]

// Sections that go through the generic SettingsSubPanelBody
const PANEL_BY_SECTION: Record<string, string> = {
  team: 'my-team',
  roster: 'roster',
  draftResults: 'draft-results-commish',
  playoffs: 'playoffs',
}

// ---------------------------------------------------------------------------
// Initial panel resolver
// ---------------------------------------------------------------------------

function panelFromInitial(initial: string | null | undefined): CommissionerSectionId | null {
  if (!initial) return null
  const map: Record<string, CommissionerSectionId> = {
    'devy-command-center': 'devy',
    'my-team': 'team',
    'co-owners': 'coowners',
    'league-history': 'history',
    'league-history-commish': 'history',
    'general-info': 'league',
    scoring: 'scoring',
    roster: 'roster',
    draft: 'draft',
    'draft-results': 'draftResults',
    'draft-results-commish': 'draftResults',
    playoffs: 'playoffs',
    'division-settings': 'divisions',
    'members-commish': 'members',
    'commish-controls': 'commissioner',
    'commish-general': 'commissioner',
    'commish-note': 'commissioner',
    'league-dues': 'dues',
  }
  return map[initial] ?? null
}

// ---------------------------------------------------------------------------
// Sport scoring panel helper
// ---------------------------------------------------------------------------

function SportScoringPanel({ sport, leagueId, isCommissioner }: { sport: string; leagueId: string; isCommissioner: boolean }) {
  const props = { leagueId, isCommissioner }
  switch (sport) {
    case 'NFL': return <NflScoringSettingsPanel {...props} />
    case 'NBA': return <NbaScoringSettingsPanel {...props} />
    case 'NCAAB': return <NcaabScoringSettingsPanel {...props} />
    case 'MLB': return <MlbScoringSettingsPanel {...props} />
    case 'NHL': return <NhlScoringSettingsPanel {...props} />
    case 'NCAAF': return <NcaafScoringSettingsPanel {...props} />
    case 'SOCCER': return <SoccerScoringSettingsPanel {...props} />
    default: return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommissionerLeagueSettingsShell({
  ctx,
  initialPanelId,
}: {
  ctx: SubPanelContext
  initialPanelId?: string | null
}) {
  const { t } = useLanguage()
  const [section, setSection] = useState<CommissionerSectionId>(
    () => panelFromInitial(initialPanelId) ?? 'league',
  )

  const isDevyLeague = useMemo(() => {
    const raw = ctx.league.settings && typeof ctx.league.settings === 'object' && !Array.isArray(ctx.league.settings)
      ? (ctx.league.settings as Record<string, unknown>).devy_league_config
      : undefined
    return ctx.league.leagueType === 'devy' || Boolean(raw)
  }, [ctx.league.leagueType, ctx.league.settings])

  useEffect(() => {
    if (!isDevyLeague && section === 'devy') setSection('league')
  }, [isDevyLeague, section])

  const navIds = useMemo(
    () => (isDevyLeague ? NAV_IDS : NAV_IDS.filter((n) => n.id !== 'devy')),
    [isDevyLeague],
  )

  const navItem = useMemo(() => navIds.find((n) => n.id === section), [navIds, section])
  const title =
    section === 'devy'
      ? 'Devy League HQ'
      : navItem
        ? t(navItem.labelKey)
        : 'Settings'
  const subtitle =
    section === 'devy'
      ? 'Rosters, pool, drafts, promotions, trades, assets, Chimmy'
      : navItem
        ? t(navItem.subtitleKey)
        : ''

  const sleeperSettingsHref = useMemo(
    () => (ctx.sleeperLeagueId ? `https://sleeper.com/leagues/${ctx.sleeperLeagueId}/settings` : null),
    [ctx.sleeperLeagueId],
  )

  // ----- Body content -----
  const body = useMemo(() => {
    switch (section) {
      case 'league':
        return (
          <LeagueRulesSummarySection
            league={ctx.league}
            displayLeague={ctx.displayLeague}
            sleeperSettingsHref={sleeperSettingsHref}
            showEditLink={Boolean(sleeperSettingsHref)}
          />
        )

      case 'devy':
        return <DevyLeagueSettingsHub ctx={ctx} />

      case 'scoring':
        return (
          <div className="space-y-6">
            <ScoringSettingsFullSection
              league={ctx.league}
              sleeperSettingsHref={sleeperSettingsHref}
              showEditLink={Boolean(sleeperSettingsHref)}
            />
            <SportScoringPanel
              sport={ctx.league.sport}
              leagueId={ctx.league.id}
              isCommissioner={ctx.isCommissioner}
            />
          </div>
        )

      case 'draft':
        return <DraftSettingsCommissionerPanel leagueId={ctx.league.id} />

      case 'divisions':
        return <DivisionSettingsCommissionerPanel leagueId={ctx.league.id} />

      case 'members':
        return <MemberSettingsCommissionerPanel leagueId={ctx.league.id} />

      case 'coowners':
        return <CoOwnerSettingsPanel leagueId={ctx.league.id} />

      case 'commissioner':
        return <CommissionerControlPanel leagueId={ctx.league.id} />

      case 'dues':
        return <LeagueDuesTrackerPanel leagueId={ctx.league.id} />

      case 'history':
        return <LeagueHistoryPanel leagueId={ctx.league.id} />

      case 'delete':
        return (
          <DeleteLeagueFromAfPanel
            leagueId={ctx.league.id}
            currentUserId={ctx.userId}
            leagueOwnerUserId={ctx.league.userId}
          />
        )

      default: {
        // draftResults, playoffs, roster, team, dues
        const panelId = PANEL_BY_SECTION[section]
        if (panelId) return <SettingsSubPanelBody panelId={panelId} ctx={ctx} />
        return <p className="text-[13px] text-white/45">Select a settings section.</p>
      }
    }
  }, [section, ctx, sleeperSettingsHref])

  return (
    <div className="flex min-h-[380px] flex-1 flex-col gap-0 md:min-h-[460px] md:flex-row">
      {/* ===== Mobile: horizontal scroll tabs ===== */}
      <div className="scrollbar-none flex gap-0.5 overflow-x-auto border-b border-white/[0.06] pb-2 md:hidden">
        {navIds.map((item) => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              data-testid={`commissioner-settings-nav-${item.id}`}
              className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {item.id === 'devy' ? 'Devy HQ' : t(item.labelKey)}
            </button>
          )
        })}
      </div>

      {/* ===== Desktop sidebar — Sleeper style: text only, no icons ===== */}
      <nav
        className="hidden w-[180px] shrink-0 flex-col gap-0 border-r border-white/[0.06] pr-3 pt-1 md:flex"
        aria-label="Commissioner settings sections"
      >
        {navIds.map((item) => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              data-testid={`commissioner-settings-nav-${item.id}`}
              className={`w-full py-2.5 text-left text-[13px] font-medium transition ${
                active
                  ? 'text-cyan-400'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {item.id === 'devy' ? 'Devy HQ' : t(item.labelKey)}
            </button>
          )
        })}
      </nav>

      {/* ===== Content area ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1 md:px-5 md:py-0">
        {/* Header — matches Sleeper: bold title + gray subtitle */}
        <div className="mb-5">
          <h2 className="text-[16px] font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-white/40">{subtitle}</p>}
        </div>

        {body}
      </div>
    </div>
  )
}
