'use client'

import { useCallback, useEffect, useState } from 'react'

const READ_STATE_STORAGE_KEY = 'commissioner_os_notifications_read'

/**
 * Client-only, localStorage-backed — mirrors CommissionerLayoutProvider's
 * and useRecentSearches' exact persistence pattern (same key-prefix
 * convention, same window-guard, same silent try/catch). Read state is
 * layered on top of whatever `read` value a notification was fetched
 * with — marking one read here never mutates the fetched payload, it
 * only adds to the set of ids this browser has since read.
 */
export function useNotificationReadState() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(READ_STATE_STORAGE_KEY)
      if (stored) setReadIds(new Set(JSON.parse(stored)))
    } catch {
      /* ignore */
    }
  }, [])

  const persist = useCallback((next: Set<string>) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(READ_STATE_STORAGE_KEY, JSON.stringify(Array.from(next)))
    } catch {
      /* ignore */
    }
  }, [])

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.has(id)) return prev
        const next = new Set(prev)
        next.add(id)
        persist(next)
        return next
      })
    },
    [persist]
  )

  const markAllRead = useCallback(
    (ids: string[]) => {
      setReadIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        persist(next)
        return next
      })
    },
    [persist]
  )

  const isRead = useCallback((id: string) => readIds.has(id), [readIds])

  return { markRead, markAllRead, isRead }
}
