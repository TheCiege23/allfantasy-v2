/**
 * lib/saved-recommendations/useSavedRecommendations.ts
 *
 * Client-side hook for the unified saved-recommendations system.
 * Handles save, unsave, status updates, and list fetching via the API.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  UnifiedSavedRecommendation,
  SavedRecommendationStatus,
  RecommendationCategory,
  AIAction,
} from '@/lib/chimmy-actions/AIActionModel'

async function trackPersonalizationEvent(
  type:
    | 'recommendation_saved'
    | 'recommendation_accepted'
    | 'recommendation_rejected'
    | 'recommendation_dismissed',
  metadata?: Record<string, unknown>,
) {
  try {
    await fetch('/api/user/chimmy-personalization/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, metadata }),
    })
  } catch {
    // Personalization telemetry should never break primary save/status flows.
  }
}

// ─── Input type for saving (matches API body exactly) ──────────────────────────

export interface SavePayload {
  leagueId?: string | null
  sport: string
  leagueType: string
  title: string
  summary: string
  recommendationType: RecommendationCategory
  recommendationPayload: Record<string, unknown>
  explanation: string
  confidence?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical' | null
  actions?: AIAction[]
  sourceSurface: string
  expiresAt?: string | null
  isCommissionerRec?: boolean
}

// ─── Save / unsave toggle ──────────────────────────────────────────────────────

export function useSaveRecommendation() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (payload: SavePayload): Promise<UnifiedSavedRecommendation | null> => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/saved-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Save failed')
        return null
      }
      const data = await res.json() as { saved: UnifiedSavedRecommendation }
      void trackPersonalizationEvent('recommendation_saved', {
        recommendationId: data.saved.id,
        recommendationType: payload.recommendationType,
        sourceSurface: payload.sourceSurface,
        leagueId: payload.leagueId ?? null,
      })
      return data.saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  const unsave = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/saved-recommendations/${id}`, { method: 'DELETE' })
      return res.ok
    } catch {
      setError('Network error')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { save, unsave, isSaving, error }
}

// ─── Status update ─────────────────────────────────────────────────────────────

export function useUpdateRecommendationStatus() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateStatus = useCallback(
    async (id: string, status: SavedRecommendationStatus): Promise<boolean> => {
      setIsUpdating(true)
      try {
        const res = await fetch(`/api/ai/saved-recommendations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_status', status }),
        })
        if (res.ok) {
          if (status === 'acted_on') {
            void trackPersonalizationEvent('recommendation_accepted', { recommendationId: id, status })
          } else if (status === 'dismissed') {
            void trackPersonalizationEvent('recommendation_dismissed', { recommendationId: id, status })
          } else if (status === 'stale') {
            void trackPersonalizationEvent('recommendation_rejected', { recommendationId: id, status })
          }
        }
        return res.ok
      } catch {
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [],
  )

  const archive = useCallback(
    async (id: string, archive = true): Promise<boolean> => {
      setIsUpdating(true)
      try {
        const res = await fetch(`/api/ai/saved-recommendations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', archive }),
        })
        if (res.ok && archive) {
          void trackPersonalizationEvent('recommendation_dismissed', { recommendationId: id, archived: true })
        }
        return res.ok
      } catch {
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [],
  )

  return { updateStatus, archive, isUpdating }
}

// ─── List hook ─────────────────────────────────────────────────────────────────

export interface UseSavedRecommendationsListOptions {
  leagueId?: string | null
  sport?: string | null
  recommendationType?: RecommendationCategory | null
  status?: SavedRecommendationStatus | null
  isArchived?: boolean
  limit?: number
  /** Set to false to skip the initial fetch */
  enabled?: boolean
}

export interface UseSavedRecommendationsListResult {
  items: UnifiedSavedRecommendation[]
  total: number
  leagueOptions: Array<{ id: string; label: string }>
  isLoading: boolean
  error: string | null
  refetch: () => void
  loadMore: () => void
  hasMore: boolean
}

export function useSavedRecommendationsList(
  opts: UseSavedRecommendationsListOptions = {},
): UseSavedRecommendationsListResult {
  const {
    leagueId,
    sport,
    recommendationType,
    status,
    isArchived = false,
    limit = 24,
    enabled = true,
  } = opts

  const [items, setItems] = useState<UnifiedSavedRecommendation[]>([])
  const [total, setTotal] = useState(0)
  const [leagueOptions, setLeagueOptions] = useState<Array<{ id: string; label: string }>>([])
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rev, setRev] = useState(0)

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (!enabled) return
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (leagueId) params.set('leagueId', leagueId)
        if (sport) params.set('sport', sport)
        if (recommendationType) params.set('recommendationType', recommendationType)
        if (status) params.set('status', status)
        params.set('isArchived', String(isArchived))
        params.set('limit', String(limit))
        params.set('offset', String(pageOffset))

        const res = await fetch(`/api/ai/saved-recommendations?${params}`)
        if (!res.ok) {
          setError('Failed to load saved recommendations')
          return
        }
        const data = await res.json() as {
          items: UnifiedSavedRecommendation[]
          total: number
          leagueOptions?: Array<{ id: string; label: string }>
        }
        setItems((prev) => (append ? [...prev, ...data.items] : data.items))
        setTotal(data.total)
        if (!append) {
          setLeagueOptions(Array.isArray(data.leagueOptions) ? data.leagueOptions : [])
        }
      } catch {
        setError('Network error')
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leagueId, sport, recommendationType, status, isArchived, limit, enabled, rev],
  )

  useEffect(() => {
    setOffset(0)
    setItems([])
    fetchPage(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, sport, recommendationType, status, isArchived, enabled, rev])

  const loadMore = useCallback(() => {
    const next = offset + limit
    setOffset(next)
    fetchPage(next, true)
  }, [offset, limit, fetchPage])

  const refetch = useCallback(() => {
    setRev((v) => v + 1)
  }, [])

  return {
    items,
    total,
    leagueOptions,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore: items.length < total,
  }
}

// ─── Single-record fetch ────────────────────────────────────────────────────────

export function useSavedRecommendation(id: string | null) {
  const [rec, setRec] = useState<UnifiedSavedRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setRec(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setRec(null)
    setIsLoading(true)
    setError(null)
    fetch(`/api/ai/saved-recommendations/${id}`)
      .then((r) => r.json())
      .then((data: { recommendation?: UnifiedSavedRecommendation; error?: string }) => {
        if (data.recommendation) setRec(data.recommendation)
        else setError(data.error ?? 'Not found')
      })
      .catch(() => setError('Network error'))
      .finally(() => setIsLoading(false))
  }, [id])

  return { rec, isLoading, error }
}
