import { useCallback, useState } from 'react'
import { type AutoCoachUserPreferences } from '@/lib/autocoach/autoCoachPreferences'

export function useAutoCoachPreferences() {
  const [preferences, setPreferences] = useState<AutoCoachUserPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/autocoach/preferences')
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      setPreferences(data.preferences)
      return data.preferences
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      console.error('[useAutoCoachPreferences] fetch error:', e)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePreferences = useCallback(
    async (updates: Partial<AutoCoachUserPreferences>) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/autocoach/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error('Failed to update preferences')
        const data = await res.json()
        setPreferences(data.preferences)
        return data.preferences
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setError(msg)
        console.error('[useAutoCoachPreferences] update error:', e)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const resetPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/autocoach/preferences', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to reset preferences')
      const data = await res.json()
      setPreferences(data.preferences)
      return data.preferences
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      console.error('[useAutoCoachPreferences] reset error:', e)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const setPositionOverride = useCallback(
    async (position: string, disabled?: boolean, minProjectionDelta?: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/autocoach/preferences/position-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position, disabled, minProjectionDelta }),
        })
        if (!res.ok) throw new Error('Failed to set position override')
        const data = await res.json()
        setPreferences(data.preferences)
        return data.preferences
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setError(msg)
        console.error('[useAutoCoachPreferences] setPositionOverride error:', e)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const excludePlayer = useCallback(
    async (playerId: string, exclude: boolean = true) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/autocoach/preferences/exclude-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, exclude }),
        })
        if (!res.ok) throw new Error('Failed to update player exclusion')
        const data = await res.json()
        setPreferences(data.preferences)
        return data.preferences
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setError(msg)
        console.error('[useAutoCoachPreferences] excludePlayer error:', e)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
    resetPreferences,
    setPositionOverride,
    excludePlayer,
  }
}
