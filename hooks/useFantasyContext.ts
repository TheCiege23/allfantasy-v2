'use client'

import { useMemo } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import { useDashboardToolLeague } from './useDashboardToolLeague'

export type PrimaryContext = 'global' | 'commissioner' | 'team'

/**
 * Dashboard V2 Phase 2.2 — FantasyContextEngine. Derives the active Primary Context
 * (Global / Commissioner / Team) from the existing league-scope selection instead of
 * tracking it as a second, independently-persisted field: selecting "All Leagues" ->
 * global, selecting a league the viewer commissions -> commissioner, selecting a
 * managed-only league -> team. Context can never drift out of sync with the selected
 * league this way, and it reuses the exact persistence (`useDashboardToolLeague`,
 * `dashboard-tool-league-storage.ts`) already shipped in Phase 2.1 — no new storage key.
 */
export function useFantasyContext(leagues: UserLeague[]) {
  const { selectedLeagueId, selectedLeague, setSelectedLeagueId, hydrated } = useDashboardToolLeague(leagues)

  const context: PrimaryContext = useMemo(() => {
    if (!selectedLeague) return 'global'
    return selectedLeague.isCommissioner ? 'commissioner' : 'team'
  }, [selectedLeague])

  return { context, selectedLeagueId, selectedLeague, setSelectedLeagueId, hydrated }
}
