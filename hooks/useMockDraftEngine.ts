'use client'

import { useCallback, useState } from 'react'
import type { MockDraftConfig } from '@/lib/mock-draft/types'
import type { MockDraftPick } from '@/lib/mock-draft/types'

export interface UseMockDraftEngineOptions {
  config: MockDraftConfig | null
  /** Total number of picks = rounds * numTeams */
  totalPicks: number
  onSave?: (results: MockDraftPick[], draftId: string | null) => void
}

export interface UseMockDraftEngineResult {
  /** Index of the last completed pick (0-based). When equal to totalPicks-1, draft is complete. */
  completedPickIndex: number
  /** Whether the draft is complete */
  isComplete: boolean
  /** Whether the draft is paused (timer stopped) */
  isPaused: boolean
  /** Advance to next pick (or advance by N). No-op if complete. */
  advance: (by?: number) => void
  /** Pause progression */
  pause: () => void
  /** Resume progression */
  resume: () => void
  /** Reset to no picks completed */
  reset: () => void
  /** Set completed index directly (e.g. restore from saved state) */
  setCompletedPickIndex: (index: number) => void
  /** Save current results to API; returns draftId if saved */
  saveResults: (results: MockDraftPick[], draftId?: string | null) => Promise<string | null>
}

export function useMockDraftEngine({
  config,
  totalPicks,
  onSave,
}: UseMockDraftEngineOptions): UseMockDraftEngineResult {
  const [completedPickIndex, setCompletedPickIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const advance = useCallback(
    (by = 1) => {
      setCompletedPickIndex((prev) => Math.min(prev + by, Math.max(0, totalPicks)))
    },
    [totalPicks],
  )

  const pause = useCallback(() => setIsPaused(true), [])
  const resume = useCallback(() => setIsPaused(false), [])
  const reset = useCallback(() => {
    setCompletedPickIndex(0)
    setIsPaused(false)
  }, [])

  const saveResults = useCallback(
    async (results: MockDraftPick[], draftId?: string | null): Promise<string | null> => {
      const metadata =
        config != null
          ? {
              sport: config.sport,
              leagueType: config.leagueType,
              draftType: config.draftType,
              numTeams: config.numTeams,
              scoringFormat: config.scoringFormat,
              timerSeconds: config.timerSeconds,
              aiEnabled: config.aiEnabled,
            }
          : undefined
      try {
        const res = await fetch('/api/mock-draft/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draftId ?? undefined,
            results,
            metadata,
            leagueId: config?.leagueId ?? null,
            rounds: config?.rounds ?? 15,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Save failed')
        const id = data.draftId ?? null
        if (id && onSave) onSave(results, id)
        return id
      } catch {
        return null
      }
    },
    [config, onSave],
  )

  return {
    completedPickIndex,
    isComplete: totalPicks > 0 && completedPickIndex >= totalPicks,
    isPaused,
    advance,
    pause,
    resume,
    reset,
    setCompletedPickIndex,
    saveResults,
  }
}
