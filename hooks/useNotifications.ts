'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PlatformNotification } from '@/types/platform-shared'
import { mergeWithPlaceholders } from '@/lib/notifications/placeholder'
import { fetchJsonWithRetry } from '@/lib/error-handling'
import {
  getNotificationsEndpoint,
  getNotificationReadEndpoint,
  NOTIFICATIONS_READ_ALL_ENDPOINT,
} from '@/lib/notification-center'

export function useNotifications(
  limit = 8,
  options?: { usePlaceholders?: boolean }
) {
  const usePlaceholders = options?.usePlaceholders ?? true
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await fetchJsonWithRetry<{ notifications?: PlatformNotification[] }>(
        getNotificationsEndpoint(limit),
        { cache: 'no-store' },
        { maxAttempts: 3, context: 'notifications' }
      )
      const raw = Array.isArray(json?.notifications) ? json.notifications : []
      setNotifications(mergeWithPlaceholders(raw, usePlaceholders))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [limit, usePlaceholders])

  useEffect(() => {
    let mounted = true
    void load().then(() => {
      if (!mounted) return
    })
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void load()
    }, 60_000)
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
      await fetch(getNotificationReadEndpoint(notificationId), {
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
      await fetch(NOTIFICATIONS_READ_ALL_ENDPOINT, { method: 'PATCH' })
      await load()
    } catch {
      await load()
    }
  }, [load])

  return { notifications, loading, error, markAsRead, markAllAsRead, refresh: load }
}
