'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSurvivorPlayerState, type UseSurvivorPlayerStateResult } from './usePlayerState'

const Ctx = createContext<UseSurvivorPlayerStateResult | null>(null)

export function SurvivorUiProvider({
  leagueId,
  children,
}: {
  leagueId: string
  children: ReactNode
}) {
  const value = useSurvivorPlayerState(leagueId)
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSurvivorUi(): UseSurvivorPlayerStateResult {
  const v = useContext(Ctx)
  if (!v) {
    throw new Error('useSurvivorUi must be used under SurvivorUiProvider')
  }
  return v
}
