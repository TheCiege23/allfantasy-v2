'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ChimmyAlertUserPreferences } from '@/lib/chimmy-alerts/types'

type PatchPayload = Omit<ChimmyAlertUserPreferences, 'snoozedAlerts'>

export function useChimmyAlertPreferences() {
  const [prefs, setPrefs] = useState<ChimmyAlertUserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/alerts/preferences', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { prefs: ChimmyAlertUserPreferences }
      setPrefs(json.prefs)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patch = useCallback(
    async (partial: PatchPayload) => {
      setSaving(true)
      // Optimistic update
      setPrefs((prev) => (prev ? { ...prev, ...partial } : (partial as ChimmyAlertUserPreferences)))
      try {
        const res = await fetch('/api/ai/alerts/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { prefs: ChimmyAlertUserPreferences }
        setPrefs(json.prefs)
      } catch (e) {
        // Revert on failure
        void load()
        setError(e instanceof Error ? e.message : 'Failed to save preferences')
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  return { prefs, loading, error, saving, patch, refresh: load }
}
