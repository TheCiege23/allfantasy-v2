'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getDraftWarRoom,
  getOffseasonDashboard,
  getTradeCommandCenter,
} from '@/lib/api/legacy'
import type {
  DraftWarRoomData,
  GetDraftWarRoomQuery,
  GetOffseasonDashboardQuery,
  GetTradeCommandCenterQuery,
  LegacyApiError,
  LegacyApiMeta,
  LegacyApiResponse,
  OffseasonDashboardData,
  TradeCommandCenterData,
} from '@/types/legacy'

type PrimaryLegacyTab = 'offseason_dashboard' | 'draft_war_room' | 'trade_command_center'

type LegacyTabDataMap = {
  offseason_dashboard: OffseasonDashboardData
  draft_war_room: DraftWarRoomData
  trade_command_center: TradeCommandCenterData
}

type LegacyTabQueryMap = {
  offseason_dashboard: GetOffseasonDashboardQuery
  draft_war_room: GetDraftWarRoomQuery
  trade_command_center: GetTradeCommandCenterQuery
}

type UseLegacyTabOptions = {
  enabled?: boolean
  autoRefresh?: boolean
}

type UseLegacyTabState<T> = {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  meta: LegacyApiMeta | null
  status: LegacyApiResponse<T>['status'] | null
  errors: LegacyApiError[]
  insufficientData: boolean
  missingFields: string[]
  lastUpdatedAt: string | null
  nextRefreshAt: string | null
  refresh: () => Promise<void>
}

const DEFAULT_TTL_MS: Record<PrimaryLegacyTab, number> = {
  offseason_dashboard: 5 * 60_000,
  draft_war_room: 60_000,
  trade_command_center: 2 * 60_000,
}

function parseRefreshMs(meta: LegacyApiMeta | null, tab: PrimaryLegacyTab): number {
  if (!meta?.needsRefreshAfter) return DEFAULT_TTL_MS[tab]
  const targetMs = Date.parse(meta.needsRefreshAfter)
  if (!Number.isFinite(targetMs)) return DEFAULT_TTL_MS[tab]
  return Math.max(5_000, targetMs - Date.now())
}

async function fetchTab<TTab extends PrimaryLegacyTab>(
  tab: TTab,
  query: LegacyTabQueryMap[TTab],
): Promise<LegacyApiResponse<LegacyTabDataMap[TTab]>> {
  if (tab === 'offseason_dashboard') {
    return getOffseasonDashboard(query as LegacyTabQueryMap['offseason_dashboard']) as Promise<
      LegacyApiResponse<LegacyTabDataMap[TTab]>
    >
  }
  if (tab === 'draft_war_room') {
    return getDraftWarRoom(query as LegacyTabQueryMap['draft_war_room']) as Promise<
      LegacyApiResponse<LegacyTabDataMap[TTab]>
    >
  }
  return getTradeCommandCenter(query as LegacyTabQueryMap['trade_command_center']) as Promise<
    LegacyApiResponse<LegacyTabDataMap[TTab]>
  >
}

export function useLegacyTab<TTab extends PrimaryLegacyTab>(
  tab: TTab,
  query: LegacyTabQueryMap[TTab],
  options?: UseLegacyTabOptions,
): UseLegacyTabState<LegacyTabDataMap[TTab]> {
  const enabled = options?.enabled ?? true
  const autoRefresh = options?.autoRefresh ?? true

  const [data, setData] = useState<LegacyTabDataMap[TTab] | null>(null)
  const [meta, setMeta] = useState<LegacyApiMeta | null>(null)
  const [status, setStatus] = useState<LegacyApiResponse<LegacyTabDataMap[TTab]>['status'] | null>(null)
  const [errors, setErrors] = useState<LegacyApiError[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef<boolean>(true)

  const clearRefreshTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const runFetch = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const response = await fetchTab(tab, query)
        if (!mountedRef.current) return

        setStatus(response.status)
        setData(response.data)
        setMeta(response.meta)
        setErrors(response.errors || [])
        setLastUpdatedAt(new Date().toISOString())

        if (response.status === 'error') {
          const msg = response.errors?.[0]?.message || 'Legacy tab request failed'
          setError(msg)
        } else {
          setError(null)
        }

        if (autoRefresh) {
          clearRefreshTimer()
          const refreshMs = parseRefreshMs(response.meta, tab)
          const nextAtIso = new Date(Date.now() + refreshMs).toISOString()
          setNextRefreshAt(nextAtIso)
          timerRef.current = setTimeout(() => {
            void runFetch(true)
          }, refreshMs)
        }
      } catch (e) {
        if (!mountedRef.current) return
        const message = e instanceof Error ? e.message : 'Unexpected legacy tab error'
        setError(message)
        setStatus('error')
      } finally {
        if (!mountedRef.current) return
        setLoading(false)
        setRefreshing(false)
      }
    },
    [autoRefresh, clearRefreshTimer, enabled, query, tab],
  )

  useEffect(() => {
    mountedRef.current = true
    if (enabled) {
      void runFetch(false)
    } else {
      setLoading(false)
    }

    return () => {
      mountedRef.current = false
      clearRefreshTimer()
    }
  }, [enabled, runFetch, clearRefreshTimer])

  const insufficientData = status === 'insufficient_data'
  const missingFields = useMemo(() => meta?.missingFields || [], [meta?.missingFields])

  return {
    data,
    loading,
    refreshing,
    error,
    meta,
    status,
    errors,
    insufficientData,
    missingFields,
    lastUpdatedAt,
    nextRefreshAt,
    refresh: async () => {
      await runFetch(true)
    },
  }
}
