'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { DepthChartPanel } from '@/components/sports/DepthChartPanel'
import type { LeagueTeamSlot, UserLeague } from '@/app/dashboard/types'
import type { LeagueSeasonSnapshot } from '@/lib/league/sort-teams-standings'
import type { LeagueDashboardView } from '@/app/league/[leagueId]/league-dashboard-types'
import { DraftTab } from '@/app/league/[leagueId]/tabs/DraftTab'
import { LeagueHomeHero } from '@/components/league-home/LeagueHomeHero'
import { LeagueHomeQuickCards } from '@/components/league-home/LeagueHomeQuickCards'
import { isExcludedFromHomeHero, resolveLeagueAccent } from '@/lib/league-home/accent-resolver'
import { resolveLeagueMedia } from '@/lib/league-home/league-media-resolver'

export type LeagueTabProps = {
  league: UserLeague
  teams: LeagueTeamSlot[]
  seasonSnapshot?: LeagueSeasonSnapshot | null
  leagueDashboard: LeagueDashboardView
  isOwner?: boolean
  isCommissioner?: boolean
  inviteToken?: string
  idpLeagueUi?: boolean
  /** Current user's team in the league — used by the home hero. Plumbed from LeagueShell. */
  userTeam?: { id: string; teamName?: string | null } | null
}

type ScoringRowProps = {
  label: string
  value: string
  highlight?: boolean
  valueTone: 'positive' | 'negative' | 'neutral'
}

function ScoringRow({ label, value, highlight, valueTone }: ScoringRowProps) {
  const valueClass =
    valueTone === 'positive'
      ? 'text-cyan-300'
      : valueTone === 'negative'
        ? 'text-red-400/95'
        : 'text-white/65'
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 ${
        highlight
          ? 'mx-2 rounded-lg border border-yellow-200/25 bg-[#fef9c3]/12'
          : 'border-b border-white/[0.05] last:border-b-0'
      }`}
    >
      <span
        className={`min-w-0 text-[12px] ${highlight ? 'text-amber-50/95' : 'text-white/50'}`}
      >
        {label}
      </span>
      <span className={`shrink-0 text-right text-[12px] font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

export function LeagueTab({
  league,
  teams,
  seasonSnapshot = null,
  leagueDashboard,
  isOwner = false,
  isCommissioner = false,
  inviteToken,
  idpLeagueUi = false,
  userTeam = null,
}: LeagueTabProps) {
  const scoring = leagueDashboard.scoring

  // Hero is gated — Tournament hubs, Zombie universes (beta_trio / alpha_hex),
  // and Big Brother leagues use their own specialty homepages.
  const showHomeHero = !isExcludedFromHomeHero(
    (league as { leagueType?: string | null }).leagueType ?? null,
    (league as { leagueVariant?: string | null }).leagueVariant ?? null
  )
  const accent = resolveLeagueAccent(
    (league as { leagueType?: string | null }).leagueType ?? null,
    (league as { leagueVariant?: string | null }).leagueVariant ?? null
  )
  const media = resolveLeagueMedia(
    String(league.sport ?? 'NFL'),
    (league as { leagueType?: string | null }).leagueType ?? null,
    (league as { leagueVariant?: string | null }).leagueVariant ?? null
  )

  return (
    <div className="space-y-4 p-5">
      {showHomeHero ? (
        <>
          <LeagueHomeHero
            league={league}
            teams={teams}
            accent={accent}
            media={media}
            userTeam={userTeam}
          />
          <LeagueHomeQuickCards
            leagueId={league.id}
            accent={accent}
            myTeamId={userTeam?.id ?? null}
          />
        </>
      ) : null}
      <DraftTab
        mode="league"
        league={league}
        teams={teams}
        isOwner={isOwner}
        isCommissioner={isCommissioner}
        inviteToken={inviteToken}
        idpLeagueUi={idpLeagueUi}
        seasonSnapshot={seasonSnapshot}
        standingsPresentation={leagueDashboard.standings}
      />

      <section
        className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1e2436]"
        aria-label="League settings"
        data-testid="league-settings-summary"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <h2 className="text-[14px] font-bold text-white sm:text-[15px]">League Settings</h2>
          <Link
            href={`/league/${encodeURIComponent(league.id)}?view=settings`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#12192e] text-white/55 transition hover:bg-white/[0.06] hover:text-cyan-200"
            aria-label="Open league settings"
            data-testid="league-settings-summary-gear"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <div className="max-h-[min(520px,55vh)] overflow-y-auto [scrollbar-gutter:stable]">
          <div className="divide-y divide-white/[0.06]">
            {leagueDashboard.settingsRows.map((row) => (
              <div
                key={row.label}
                className={`flex gap-3 px-4 py-3 sm:px-5 ${row.multiline ? 'items-start' : 'items-center justify-between'}`}
              >
                <span className="min-w-0 shrink text-[12px] text-white/55">{row.label}</span>
                <span
                  className={`text-right text-[12px] font-semibold text-white/95 ${
                    row.multiline ? 'max-w-[min(100%,20rem)] whitespace-pre-line' : 'min-w-0'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c1e]"
        aria-label="Scoring settings"
        data-testid="league-scoring-summary"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <h2 className="text-[14px] font-bold text-white">Scoring</h2>
          <Link
            href={`/league/${encodeURIComponent(league.id)}?view=settings`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#12192e] text-white/55 transition hover:bg-white/[0.06] hover:text-cyan-200"
            aria-label="Open league settings to edit scoring"
            data-testid="league-scoring-summary-gear"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </Link>
        </div>

        <p className="border-b border-white/[0.05] px-4 py-2.5 text-[11px] leading-snug text-white/45 sm:px-5">
          {scoring == null ? (
            <>Scoring details are unavailable for this league.</>
          ) : scoring.nonStandardCount > 0 ? (
            <>
              Non-standard scoring settings (vs this format’s defaults) are{' '}
              <span className="text-yellow-100/90">highlighted</span>.
            </>
          ) : (
            <>
              Matches the <span className="text-white/70">{scoring.formatType}</span> template defaults
              for this sport — change scoring in League Settings to customize.
            </>
          )}
        </p>

        {!scoring || scoring.sections.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-white/45 sm:px-5">
            {scoring ? 'No scoring rules to display.' : 'Could not load scoring configuration.'}
          </p>
        ) : (
          <div className="pb-2">
            {scoring.sections.map((section) => (
              <div key={section.title} className="px-0 pb-1">
                <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/45 sm:px-5">
                  {section.title}
                </p>
                <div className="mt-1 space-y-0.5">
                  {section.rows.map((row, idx) => (
                    <ScoringRow
                      key={`${section.title}-${row.label}-${idx}`}
                      label={row.label}
                      value={row.value}
                      highlight={row.highlight}
                      valueTone={row.valueTone}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Depth Chart panel */}
      <DepthChartPanel sport={String(league.sport)} team={teams[0]?.teamName ?? undefined} />
    </div>
  )
}
