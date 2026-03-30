'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import { addStateRefreshListener } from '@/lib/state-consistency/state-events'
import type { LeagueForGrouping } from '@/lib/dashboard'

const MAX_SIGNAL_LEAGUES = 24

export type DashboardDraftSignal = {
  leagueId: string
  status: string
  updatedAt: string
}

export type DashboardMatchupSignal = {
  leagueId: string
  week: number
  seasonYear: number
  matchupCount: number
  updatedAt: string
}

type DashboardSignalsResponse = {
  upcomingDrafts?: DashboardDraftSignal[]
  liveMatchups?: DashboardMatchupSignal[]
}

export function useDashboardHomeSignals(leagues: LeagueForGrouping[], enabled: boolean) {
  const leagueIds = useMemo(
    () =>
      Array.from(
        new Set(
          leagues
            .map((league) => (typeof league.id === 'string' ? league.id.trim() : ''))
            .filter(Boolean)
        )
      ).slice(0, MAX_SIGNAL_LEAGUES),
    [leagues]
  )
  const leagueIdsKey = useMemo(() => leagueIds.join('|'), [leagueIds])
  const lastFocusRefetch = useRef(0)

  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<string | null>(null)
  const [upcomingDrafts, setUpcomingDrafts] = useState<DashboardDraftSignal[]>([])
  const [liveMatchups, setLiveMatchups] = useState<DashboardMatchupSignal[]>([])

  const fetchSignals = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setUpcomingDrafts([])
      setLiveMatchups([])
      return
    }
    if (leagueIds.length === 0) {
      setLoading(false)
      setError(null)
      setUpcomingDrafts([])
      setLiveMatchups([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      for (const leagueId of leagueIds) params.append('leagueId', leagueId)
      const res = await fetch(`/api/dashboard/home/signals?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setUpcomingDrafts([])
        setLiveMatchups([])
        setError('Unable to load dashboard live signals.')
        return
      }
      const data = (await res.json().catch(() => ({}))) as DashboardSignalsResponse
      setUpcomingDrafts(Array.isArray(data?.upcomingDrafts) ? data.upcomingDrafts : [])
      setLiveMatchups(Array.isArray(data?.liveMatchups) ? data.liveMatchups : [])
    } catch {
      setUpcomingDrafts([])
      setLiveMatchups([])
      setError('Unable to load dashboard live signals.')
    } finally {
      setLoading(false)
    }
  }, [enabled, leagueIds])

  useEffect(() => {
    void fetchSignals()
  }, [fetchSignals, leagueIdsKey])

  useEffect(() => {
    if (!enabled) return
    const onForeground = () => {
      const now = Date.now()
      if (now - lastFocusRefetch.current < FOCUS_REFETCH_THROTTLE_MS) return
      lastFocusRefetch.current = now
      void fetchSignals()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      onForeground()
    }
    window.addEventListener('focus', onForeground)
    window.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', onForeground)
      window.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, fetchSignals])

  useEffect(() => {
    if (!enabled) return
    return addStateRefreshListener(['leagues', 'drafts', 'all'], () => void fetchSignals())
  }, [enabled, fetchSignals])

  return {
    loading,
    error,
    upcomingDrafts,
    liveMatchups,
    refetch: fetchSignals,
  }
}

