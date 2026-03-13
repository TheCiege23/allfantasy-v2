'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PlatformNotification } from '@/types/platform-shared'
import { mergeWithPlaceholders } from '@/lib/notifications/placeholder'

export function useNotifications(limit = 8) {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared/notifications?limit=${limit}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      const raw = Array.isArray(json?.notifications) ? json.notifications : []
      setNotifications(mergeWithPlaceholders(raw))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    let mounted = true
    load().then(() => {
      if (!mounted) return
    })
    const timer = setInterval(() => load(), 60_000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [load])

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    try {
      await fetch(`/api/shared/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
      })
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
      )
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/shared/notifications/read-all', { method: 'PATCH' })
      await load()
    } catch {
      await load()
    }
  }, [load])

  return { notifications, loading, error, markAsRead, markAllAsRead, refresh: load }
}
