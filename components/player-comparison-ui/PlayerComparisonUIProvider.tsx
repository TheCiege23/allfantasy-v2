'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OpenPlayerComparisonPayload } from '@/lib/player-comparison-ui/types'
import { PlayerComparisonDrawer } from './PlayerComparisonDrawer'

type PlayerComparisonUIContextValue = {
  openComparison: (payload: OpenPlayerComparisonPayload) => void
  closeComparison: () => void
  isOpen: boolean
}

const PlayerComparisonUIContext = createContext<PlayerComparisonUIContextValue | null>(null)

export function usePlayerComparisonUI(): PlayerComparisonUIContextValue {
  const ctx = useContext(PlayerComparisonUIContext)
  if (!ctx) {
    throw new Error('usePlayerComparisonUI must be used within PlayerComparisonUIProvider')
  }
  return ctx
}

/** Safe for optional UI (e.g. draft card) when provider not mounted */
export function usePlayerComparisonUIOptional(): PlayerComparisonUIContextValue | null {
  return useContext(PlayerComparisonUIContext)
}

export function PlayerComparisonUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [payload, setPayload] = useState<OpenPlayerComparisonPayload | null>(null)

  const openComparison = useCallback((p: OpenPlayerComparisonPayload) => {
    setPayload(p)
    setIsOpen(true)
  }, [])

  const closeComparison = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      openComparison,
      closeComparison,
      isOpen,
    }),
    [openComparison, closeComparison, isOpen]
  )

  return (
    <PlayerComparisonUIContext.Provider value={value}>
      {children}
      <PlayerComparisonDrawer open={isOpen} onClose={closeComparison} initialPayload={payload} />
    </PlayerComparisonUIContext.Provider>
  )
}
