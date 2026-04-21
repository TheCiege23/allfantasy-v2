'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CoachingPlanResponse, StrategyLens } from '@/lib/ai/coaching/coachingPlanTypes'

type TimelineYears = 2 | 3 | 4 | 5

export function useAICoachingPlan(opts: {
  leagueId: string
  timelineYears: TimelineYears
  strategyLens: StrategyLens
}) {
  const [plan, setPlan] = useState<CoachingPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [aiModel, setAiModel] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/coaching/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: opts.leagueId,
          timelineYears: opts.timelineYears,
          strategyLens: opts.strategyLens,
        }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        plan?: CoachingPlanResponse
        usedFallback?: boolean
        aiModel?: string | null
        error?: string
      }
      if (!res.ok || !json.ok || !json.plan) {
        setPlan(null)
        setUsedFallback(false)
        setAiModel(null)
        setError(typeof json.error === 'string' ? json.error : 'Could not load coaching plan.')
        return
      }
      setPlan(json.plan)
      setUsedFallback(Boolean(json.usedFallback))
      setAiModel(json.aiModel ?? null)
    } catch {
      setPlan(null)
      setUsedFallback(false)
      setAiModel(null)
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }, [opts.leagueId, opts.timelineYears, opts.strategyLens])

  useEffect(() => {
    void fetchPlan()
  }, [fetchPlan])

  return { plan, loading, error, usedFallback, aiModel, refetch: fetchPlan }
}
