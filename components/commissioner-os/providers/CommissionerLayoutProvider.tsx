'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const SIDEBAR_STORAGE_KEY = 'commissioner_os_sidebar_collapsed'

interface CommissionerLayoutContextValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  /** Below Desktop width the sidebar is a drawer, per Design Language §2. */
  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const Ctx = createContext<CommissionerLayoutContextValue | null>(null)

export function CommissionerLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored === 'true') setSidebarCollapsedState(true)
    } catch {
      /* ignore */
    }
  }, [])

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<CommissionerLayoutContextValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      setSidebarCollapsed,
      mobileSidebarOpen,
      toggleMobileSidebar: () => setMobileSidebarOpen((open) => !open),
      closeMobileSidebar: () => setMobileSidebarOpen(false),
    }),
    [sidebarCollapsed, mobileSidebarOpen]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCommissionerLayout() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCommissionerLayout must be used inside CommissionerLayoutProvider')
  return ctx
}
