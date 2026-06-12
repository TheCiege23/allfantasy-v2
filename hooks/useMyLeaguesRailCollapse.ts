'use client'

import { useCallback, useEffect, useState } from 'react'

const DEFAULT_STORAGE_KEY = 'af-myleagues-rail-collapsed'

/**
 * Persisted collapse state for the dashboard / league 3-column shell (right "My Leagues" rail).
 *
 * @param options.storageKey - Custom sessionStorage key (isolates league vs dashboard preference).
 * @param options.defaultCollapsed - Initial value before hydration from storage (default: false).
 */
export function useMyLeaguesRailCollapse(options?: { storageKey?: string; defaultCollapsed?: boolean }) {
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY
  const defaultCollapsed = options?.defaultCollapsed ?? false
  const [collapsed, setCollapsedState] = useState(defaultCollapsed)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      // Only override default if the user has an explicit saved preference for this key
      if (stored !== null) {
        setCollapsedState(stored === '1')
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [storageKey])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    try {
      sessionStorage.setItem(storageKey, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        sessionStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [storageKey])

  return { collapsed: hydrated ? collapsed : defaultCollapsed, setCollapsed, toggle, hydrated }
}
