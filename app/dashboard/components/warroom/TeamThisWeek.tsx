'use client'

import { CalendarClock } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { MatchupPreviewCard } from './MatchupPreviewCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

/** Leagues with a live weekly matchup to surface as the Team Focus primary decision card. */
function hasLiveMatchups(league: UserLeague): boolean {
  const stage = league.lifecycleState || league.status
  return stage === 'in_season' || stage === 'playoffs'
}

/**
 * Dashboard V2 Phase 2.4 — Team Focus "This Week's Matchup", the primary decision card.
 * Reuses the existing single-league `MatchupPreviewCard` (real scores/projection/win-prob)
 * for in-season/playoff leagues; before the season starts there is genuinely no matchup to
 * show, so instead of the card silently returning null (leaving Team Focus's headline
 * section missing) this renders an honest empty state that names why. No new data source.
 */
export function TeamThisWeek({ league, userId }: { league: UserLeague; userId: string | null }) {
  const { t } = useLanguage()

  const emptyState = (
    <WarRoomCard className="flex items-start gap-3 p-4" accentBorder="rgba(34,211,238,0.14)">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300/70">
        <CalendarClock className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/80">
          {t('dashboard.warroom.teamThisWeek.emptyTitle')}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/40">
          {t('dashboard.warroom.teamThisWeek.emptyDesc')}
        </p>
      </div>
    </WarRoomCard>
  )

  // Pre-season leagues have no matchup at all — show the empty state directly (no wasted fetch).
  // In-season/playoff leagues render the real matchup card, but fall back to the same empty state
  // if the league genuinely has no matchup rows yet (e.g. between weeks), so the section heading
  // is never left orphaned above nothing.
  if (!hasLiveMatchups(league)) {
    return emptyState
  }
  return <MatchupPreviewCard league={league} userId={userId} fallback={emptyState} />
}
