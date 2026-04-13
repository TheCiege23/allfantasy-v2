'use client'

/**
 * AISurfaceContext — unified AI context contract for all Chimmy surfaces.
 * Every page-level AI surface reads from this context to adapt its behavior,
 * prompts, and visible features based on user role, sport, league type, and
 * premium subscription state.
 */

import React, { createContext, useContext } from 'react'
import type { SupportedLeagueSport, LeagueType, UserRole, UnifiedLeagueSettings } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes'

// ─── Subscription state ────────────────────────────────────────────────────

export interface AISurfaceSubscriptionState {
  /** e.g. 'free' | 'pro' | 'commissioner' | 'admin' */
  tier: string
  hasPremium: boolean
  hasCommissioner: boolean
  hasAdmin: boolean
}

// ─── Minimal team/league live states ──────────────────────────────────────

export interface AISurfaceTeamState {
  teamId: string
  teamName: string
  record: string
  rank: number
  rosterCount?: number
  injuredCount?: number
}

export interface AISurfaceLeagueState {
  leagueId: string
  leagueName: string
  currentWeek?: number
  totalTeams?: number
  isInPlayoffs?: boolean
  isDraftComplete?: boolean
  isLive?: boolean
}

export interface AISurfaceLiveData {
  /** Sparse map of player status by player id */
  playerStatuses?: Record<string, 'active' | 'injured' | 'questionable' | 'out'>
  /** Sparse map of live scores by team id */
  liveScores?: Record<string, number>
  lastUpdatedAt?: number
}

// ─── Primary context shape ─────────────────────────────────────────────────

export interface AISurfaceContextValue {
  /** Authenticated user id */
  userId: string | null
  /** Display name */
  userName?: string | null
  /** User's role in the current league */
  role: UserRole | 'admin' | null
  /** Current sport scope */
  sport: SupportedLeagueSport | null
  /** Current league format */
  leagueType: LeagueType | null
  /** Full league settings object when in a league context */
  leagueSettings: UnifiedLeagueSettings | null
  /** Current team context (if user is in a league) */
  teamState: AISurfaceTeamState | null
  /** Current league state snapshot */
  leagueState: AISurfaceLeagueState | null
  /** Live game/player data snapshot */
  liveData: AISurfaceLiveData | null
  /** Subscription / premium state */
  subscriptionState: AISurfaceSubscriptionState
  /** Whether the surface is in a fully-loaded state */
  isReady: boolean
  /** Loader flag during async hydration */
  isLoading: boolean
}

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_SUBSCRIPTION_STATE: AISurfaceSubscriptionState = {
  tier: 'free',
  hasPremium: false,
  hasCommissioner: false,
  hasAdmin: false,
}

const DEFAULT_CONTEXT: AISurfaceContextValue = {
  userId: null,
  userName: null,
  role: null,
  sport: null,
  leagueType: null,
  leagueSettings: null,
  teamState: null,
  leagueState: null,
  liveData: null,
  subscriptionState: DEFAULT_SUBSCRIPTION_STATE,
  isReady: false,
  isLoading: false,
}

// ─── Context ───────────────────────────────────────────────────────────────

const AISurfaceCtx = createContext<AISurfaceContextValue>(DEFAULT_CONTEXT)

// ─── Provider ─────────────────────────────────────────────────────────────

export interface AISurfaceProviderProps {
  value: Partial<AISurfaceContextValue>
  children: React.ReactNode
}

/**
 * AISurfaceProvider — wrap any page or layout to inject AI surface context.
 *
 * @example
 * ```tsx
 * <AISurfaceProvider value={{ userId, role: 'commissioner', sport: 'NFL', leagueType: 'redraft', leagueSettings, subscriptionState }}>
 *   {children}
 * </AISurfaceProvider>
 * ```
 */
export function AISurfaceProvider({ value, children }: AISurfaceProviderProps) {
  const merged: AISurfaceContextValue = {
    ...DEFAULT_CONTEXT,
    ...value,
    subscriptionState: {
      ...DEFAULT_SUBSCRIPTION_STATE,
      ...(value.subscriptionState ?? {}),
    },
  }

  return (
    <AISurfaceCtx.Provider value={merged}>
      {children}
    </AISurfaceCtx.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useAISurface — access the unified AI surface context from any component.
 * Returns the full AISurfaceContextValue.
 *
 * @example
 * ```tsx
 * const { role, sport, subscriptionState } = useAISurface()
 * ```
 */
export function useAISurface(): AISurfaceContextValue {
  return useContext(AISurfaceCtx)
}
