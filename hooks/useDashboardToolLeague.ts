'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import {
  resolveDashboardToolLeagueId,
  writeDashboardToolLeagueId,
} from '@/lib/dashboard/dashboard-tool-league-storage'

/**
 * Single selected league for dashboard "League Intelligence" + Global AI Tools grid (home /dashboard only).
 * `null` is "All Leagues" — a real, persisted default (Dashboard V2's Global Command Center), not just
 * a transient gap before some league gets auto-picked.
 */
export function useDashboardToolLeague(leagues: UserLeague[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSelectedId((prev) => {
      if (leagues.length === 0) return null
      if (prev && leagues.some((l) => l.id === prev)) return prev
      return resolveDashboardToolLeagueId(leagues, prev)
    })
    setHydrated(true)
  }, [leagues])

  const selectedLeague = useMemo(
    () => (selectedId ? leagues.find((l) => l.id === selectedId) ?? null : null),
    [leagues, selectedId],
  )

  const setSelectedLeagueId = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      writeDashboardToolLeagueId(id)
    },
    [],
  )

  return { selectedLeagueId: selectedId, selectedLeague, setSelectedLeagueId, hydrated }
}
