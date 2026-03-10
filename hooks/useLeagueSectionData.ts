'use client'

import { useCallback, useEffect, useState } from 'react'

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

  return { data, loading, error, reload: load }
}
