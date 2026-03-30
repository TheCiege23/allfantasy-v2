'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import { addStateRefreshListener, type StateRefreshDomain } from '@/lib/state-consistency/state-events'

export type LeagueSectionResult<T = unknown> = {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useLeagueSectionData<T = unknown>(
  leagueId: string,
  sectionPath: string,
): LeagueSectionResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const lastFocusRefetch = useRef(0)
  const sectionDomains = useMemo<StateRefreshDomain[]>(() => {
    const normalizedSection = sectionPath.toLowerCase()
    if (normalizedSection.includes('draft')) {
      return ['drafts', 'leagues', 'all']
    }
    return ['leagues', 'all']
  }, [sectionPath])

  const load = useCallback(async () => {
    if (!leagueId || !sectionPath) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/app/league/${encodeURIComponent(leagueId)}/${sectionPath}`, {
        cache: 'no-store',
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.message || json?.error || `Failed to load ${sectionPath}`)
        setData(null)
      } else {
        setData(json)
      }
    } catch {
      setError(`Failed to load ${sectionPath}`)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId, sectionPath])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onForeground = () => {
      if (!leagueId || !sectionPath) return
      const now = Date.now()
      if (now - lastFocusRefetch.current < FOCUS_REFETCH_THROTTLE_MS) return
      lastFocusRefetch.current = now
      void load()
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
  }, [leagueId, load, sectionPath])

  useEffect(
    () =>
      addStateRefreshListener(sectionDomains, (detail) => {
        if (detail.leagueId && leagueId && detail.leagueId !== leagueId) return
        void load()
      }),
    [leagueId, load, sectionDomains]
  )

  return { data, loading, error, reload: load }
}
