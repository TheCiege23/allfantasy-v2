'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import {
  resolveDashboardToolLeagueId,
  writeDashboardToolLeagueId,
} from '@/lib/dashboard/dashboard-tool-league-storage'

/**
 * Single selected league for dashboard "League Intelligence" + Global AI Tools grid (home /dashboard only).
 */
export function useDashboardToolLeague(leagues: UserLeague[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId((prev) => {
      if (leagues.length === 0) return null
      if (prev && leagues.some((l) => l.id === prev)) return prev
      return resolveDashboardToolLeagueId(leagues, prev)
    })
  }, [leagues])

  const selectedLeague = useMemo(
    () => (selectedId ? leagues.find((l) => l.id === selectedId) ?? null : null),
    [leagues, selectedId],
  )

  const setSelectedLeagueId = useCallback(
    (id: string) => {
      setSelectedId(id)
      writeDashboardToolLeagueId(id)
    },
    [],
  )

  return { selectedLeagueId: selectedId, selectedLeague, setSelectedLeagueId }
}
