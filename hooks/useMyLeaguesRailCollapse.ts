'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'af-myleagues-rail-collapsed'

/**
 * Persisted collapse state for the dashboard / league 3-column shell (right "My Leagues" rail).
 */
export function useMyLeaguesRailCollapse() {
  const [collapsed, setCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setCollapsedState(sessionStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { collapsed: hydrated ? collapsed : false, setCollapsed, toggle, hydrated }
}
