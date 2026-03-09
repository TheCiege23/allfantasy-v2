'use client'

import { useEffect, useState } from 'react'
import type { PlatformNotification } from '@/types/platform-shared'

export function useNotifications(limit = 8) {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch(`/api/shared/notifications?limit=${limit}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        setNotifications(Array.isArray(json?.notifications) ? json.notifications : [])
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to load notifications')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    const timer = setInterval(() => void load(), 60_000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [limit])

  return { notifications, loading, error }
}
