'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Crown, Sparkles, Swords } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { useGreetingPeriod } from './useGreeting'
import { getLeagueTypeMedia } from '@/lib/league-media/leagueTypeMedia'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import type { PrimaryContext } from '@/hooks/useFantasyContext'

const EYEBROW_KEY: Record<PrimaryContext, string> = {
  global: 'dashboard.warroom.hero.globalEyebrow',
  commissioner: 'dashboard.warroom.hero.commissionerEyebrow',
  team: 'dashboard.warroom.hero.teamEyebrow',
}

const HEADLINE_KEY: Record<PrimaryContext, string> = {
  global: 'dashboard.warroom.hero.globalHeadline',
  commissioner: 'dashboard.warroom.hero.commissionerHeadline',
  team: 'dashboard.warroom.hero.teamHeadline',
}

/**
 * Dashboard V2 Phase 2.2 — context-aware Hero (renamed from the Phase 2.1
 * `GlobalCommandCenterHero`). Same layout and Robot King placeholder slot in every
 * context; only the eyebrow/headline copy and the persistent context indicator change
 * per the active `FantasyContextEngine` context — no new artwork, no duplicated hero.
 */
export function DashboardHero({
  context,
  userName,
  leagues,
  selectedLeagueId,
  selectedLeague,
  onSelectLeagueId,
  urgentTodayCount,
}: {
  context: PrimaryContext
  userName: string
  leagues: UserLeague[]
  selectedLeagueId: string | null
  selectedLeague: UserLeague | null
  onSelectLeagueId: (id: string | null) => void
  urgentTodayCount: number
}) {
  const { t, tInterpolate } = useLanguage()
  const greetingPeriod = useGreetingPeriod()
  const isCommissionerAnywhere = leagues.some((l) => l.isCommissioner)
  // Real placeholder pixels (getLeagueTypeMedia), not invented Robot King art — see Risk #6.
  const heroArt = getLeagueTypeMedia(selectedLeague?.leagueType ?? null)

  return (
    <WarRoomCard className="relative overflow-hidden p-5" accentBorder="rgba(34,211,238,0.15)">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,211,238,0.16) 0%, transparent 70%)' }} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24">
          <Image src={heroArt.thumbnail} alt="" fill sizes="96px" className="object-cover opacity-90" />
          <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-white/70">
            {t('dashboard.warroom.hero.artPlaceholder')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/60">
              {t(EYEBROW_KEY[context])}
            </p>
            {urgentTodayCount > 0 ? (
              <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300">
                {tInterpolate('dashboard.warroom.hero.todayCount', { n: urgentTodayCount })}
              </span>
            ) : null}
          </div>
          {greetingPeriod ? (
            <p className="mt-1.5 text-[13px] font-semibold text-white/70">
              {tInterpolate(`dashboard.warroom.hero.greeting.${greetingPeriod}`, { name: userName })}
            </p>
          ) : null}
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-white sm:text-[28px]">
            {t(HEADLINE_KEY[context])}
          </h1>

          {/* League Scope selector + persistent Context Indicator — the FantasyContextEngine's
              only entry point in Phase 2.2 (selecting a league drives the active context; see
              useFantasyContext). Scoped to this Dashboard page only, per Section 0.5. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="league-scope-selector">{t('dashboard.warroom.hero.scopeLabel')}</label>
            <select id="league-scope-selector" value={selectedLeagueId ?? ''}
              onChange={(e) => onSelectLeagueId(e.target.value || null)}
              className="rounded-xl border border-white/10 bg-[#0a1220] px-3 py-1.5 text-[12px] font-semibold text-white/85">
              <option value="">{t('dashboard.warroom.hero.scopeAllLeagues')}</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <span
              data-testid="dashboard-context-indicator"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50"
            >
              {t(EYEBROW_KEY[context])}
              <span aria-hidden className="text-white/20">·</span>
              <span className="normal-case tracking-normal text-white/60">
                {selectedLeague ? selectedLeague.name : t('dashboard.warroom.hero.scopeAllLeagues')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick navigation shortcuts — trimmed to the 3 highest-value entry points; league
          creation/import stay reachable via the persistent right rail, not duplicated here. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/war-room"
          className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.12] via-cyan-500/[0.06] to-transparent p-4 transition hover:border-cyan-400/50 hover:from-cyan-500/[0.18] active:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Swords className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-white">{t('dashboard.warroom.hero.navWarRoomTitle')}</p>
          <p className="text-[12px] leading-snug text-white/55">{t('dashboard.warroom.hero.navWarRoomDesc')}</p>
          <span className="mt-auto pt-1 text-[12px] font-semibold text-cyan-400 transition group-hover:text-cyan-300">
            {t('dashboard.warroom.hero.navEnter')}
          </span>
        </Link>

        <Link
          href="/commissioner-hub"
          className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] via-amber-500/[0.05] to-transparent p-4 shadow-[0_0_20px_rgba(245,158,11,0.06)] transition hover:border-amber-400/50 hover:from-amber-500/[0.16] active:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <Crown className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-white">
            {isCommissionerAnywhere
              ? t('dashboard.warroom.hero.navCommissionerHubTitle')
              : t('dashboard.warroom.hero.navRunLeagueTitle')}
          </p>
          <p className="text-[12px] leading-snug text-white/55">{t('dashboard.warroom.hero.navCommissionerHubDesc')}</p>
          <span className="mt-auto pt-1 text-[12px] font-semibold text-amber-400 transition group-hover:text-amber-300">
            {t('dashboard.warroom.hero.navEnter')}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
            window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
          }}
          className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.10] via-violet-500/[0.05] to-transparent p-4 text-left transition hover:border-violet-400/50 hover:from-violet-500/[0.16] active:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-white">{t('dashboard.warroom.hero.navChimmyTitle')}</p>
          <p className="text-[12px] leading-snug text-white/55">{t('dashboard.warroom.hero.navChimmyDesc')}</p>
          <span className="mt-auto pt-1 text-[12px] font-semibold text-violet-400 transition group-hover:text-violet-300">
            {t('dashboard.warroom.hero.navAsk')}
          </span>
        </button>
      </div>
    </WarRoomCard>
  )
}
