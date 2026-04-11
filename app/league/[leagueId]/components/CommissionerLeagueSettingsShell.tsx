'use client'

import { useMemo, useState } from 'react'
import {
  BarChart2,
  ClipboardList,
  Grid,
  History,
  Medal,
  PiggyBank,
  Settings,
  Shield,
  Trash2,
  Trophy,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { DeleteLeagueFromAfPanel } from './DeleteLeagueFromAfPanel'
import { LeagueRulesSummarySection } from './LeagueRulesSummarySection'
import { ScoringSettingsFullSection } from './ScoringSettingsFullSection'
import { SettingsSubPanelBody, type SubPanelContext } from './LeagueSettingsSubPanels'

export type CommissionerSectionId =
  | 'league'
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

const NAV: { id: CommissionerSectionId; label: string; icon: typeof Settings }[] = [
  { id: 'league', label: 'League Settings', icon: Settings },
  { id: 'team', label: 'Team Settings', icon: User },
  { id: 'roster', label: 'Roster Settings', icon: Users },
  { id: 'scoring', label: 'Scoring Settings', icon: BarChart2 },
  { id: 'draft', label: 'Draft Settings', icon: ClipboardList },
  { id: 'draftResults', label: 'Draft Results', icon: Grid },
  { id: 'playoffs', label: 'Playoff Settings', icon: Medal },
  { id: 'divisions', label: 'Division Settings', icon: Trophy },
  { id: 'members', label: 'Member Settings', icon: Users },
  { id: 'coowners', label: 'Co-owner Settings', icon: UserPlus },
  { id: 'commissioner', label: 'Commissioner Control', icon: Shield },
  { id: 'dues', label: 'League Dues Tracker', icon: PiggyBank },
  { id: 'history', label: 'Previous Leagues', icon: History },
  { id: 'delete', label: 'Delete League', icon: Trash2 },
]

const PANEL_BY_SECTION: Record<Exclude<CommissionerSectionId, 'league' | 'delete' | 'scoring'>, string> = {
  team: 'my-team',
  roster: 'roster',
  draft: 'draft',
  draftResults: 'draft-results-commish',
  playoffs: 'playoffs',
  divisions: 'division-settings',
  members: 'members-commish',
  coowners: 'co-owners',
  commissioner: 'commish-controls',
  dues: 'league-dues',
  history: 'league-history-commish',
}

function panelFromInitial(initial: string | null | undefined): CommissionerSectionId | null {
  if (!initial) return null
  const map: Record<string, CommissionerSectionId> = {
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
    'league-dues': 'dues',
    'commish-general': 'commissioner',
    'commish-note': 'commissioner',
  }
  return map[initial] ?? null
}

export function CommissionerLeagueSettingsShell({
  ctx,
  initialPanelId,
}: {
  ctx: SubPanelContext
  initialPanelId?: string | null
}) {
  const [section, setSection] = useState<CommissionerSectionId>(() => panelFromInitial(initialPanelId) ?? 'league')

  const title = useMemo(() => NAV.find((n) => n.id === section)?.label ?? 'Settings', [section])

  const sleeperSettingsHref = useMemo(
    () => (ctx.sleeperLeagueId ? `https://sleeper.com/leagues/${ctx.sleeperLeagueId}/settings` : null),
    [ctx.sleeperLeagueId],
  )

  const body = useMemo(() => {
    if (section === 'league') {
      return (
        <LeagueRulesSummarySection
          league={ctx.league}
          displayLeague={ctx.displayLeague}
          sleeperSettingsHref={sleeperSettingsHref}
          showEditLink={Boolean(sleeperSettingsHref)}
        />
      )
    }
    if (section === 'scoring') {
      return (
        <ScoringSettingsFullSection
          league={ctx.league}
          sleeperSettingsHref={sleeperSettingsHref}
          showEditLink={Boolean(sleeperSettingsHref)}
        />
      )
    }
    if (section === 'delete') {
      return (
        <DeleteLeagueFromAfPanel
          leagueId={ctx.league.id}
          currentUserId={ctx.userId}
          leagueOwnerUserId={ctx.league.userId}
        />
      )
    }
    const panelId = PANEL_BY_SECTION[section]
    return <SettingsSubPanelBody panelId={panelId} ctx={ctx} />
  }, [section, ctx, sleeperSettingsHref])

  return (
    <div className="flex min-h-[320px] flex-1 flex-col gap-0 md:min-h-[420px] md:flex-row md:gap-3">
      {/* Mobile: horizontal chips */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-2 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              data-testid={`commissioner-settings-nav-${item.id}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
                active
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-100'
                  : 'border-transparent bg-white/[0.04] text-white/45'
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
              {item.label.replace(' Settings', '').replace(' Control', '')}
            </button>
          )
        })}
      </div>

      {/* Desktop sidebar */}
      <nav
        className="hidden w-[200px] shrink-0 flex-col gap-0.5 border-r border-white/[0.06] pr-2 md:flex"
        aria-label="Commissioner settings sections"
      >
        {NAV.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          const danger = item.id === 'delete'
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              data-testid={`commissioner-settings-nav-${item.id}`}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold transition ${
                danger
                  ? active
                    ? 'bg-rose-500/15 text-rose-100'
                    : 'text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-200'
                  : active
                    ? 'bg-cyan-500/12 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]'
                    : 'text-white/55 hover:bg-white/[0.05] hover:text-white/85'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
              <span className="leading-tight">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 md:py-0">
        <div className="mb-3 flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
          <div>
            <h2 className="text-[15px] font-bold text-white">{title}</h2>
            <p className="text-[11px] text-white/40">League homepage · commissioner view</p>
          </div>
        </div>
        {body}
      </div>
    </div>
  )
}
