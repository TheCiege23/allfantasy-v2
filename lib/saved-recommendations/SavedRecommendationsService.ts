/**
 * lib/saved-recommendations/SavedRecommendationsService.ts
 *
 * CRUD + staleness + comparison service for the unified saved-recommendations system.
 * All writes are server-side only. Reads are callable from server components and
 * API routes. Never import this file from 'use client' files — use the API routes.
 */

import { createClient } from '@supabase/supabase-js'
import type {
  UnifiedSavedRecommendation,
  SavedRecommendationStatus,
  RecommendationCategory,
  AIAction,
} from '@/lib/chimmy-actions/AIActionModel'

// ─── Supabase client (server) ───────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Input Types ────────────────────────────────────────────────────────────────

export interface SaveRecommendationInput {
  userId: string
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
  /** ISO string or null */
  expiresAt?: string | null
  isCommissionerRec?: boolean
}

export interface ListSavedRecommendationsOptions {
  userId: string
  leagueId?: string | null
  sport?: string | null
  recommendationType?: RecommendationCategory | null
  status?: SavedRecommendationStatus | null
  isArchived?: boolean
  limit?: number
  offset?: number
}

// ─── DB Row → Model mapper ──────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): UnifiedSavedRecommendation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    leagueId: (row.league_id as string | null) ?? null,
    sport: (row.sport as string) ?? 'all',
    leagueType: (row.league_type as string) ?? 'all',
    title: (row.title as string) ?? '',
    summary: (row.summary as string) ?? '',
    recommendationType: (row.recommendation_type as RecommendationCategory) ?? 'general',
    recommendationPayload: (row.recommendation_payload as Record<string, unknown>) ?? {},
    explanation: (row.explanation as string) ?? '',
    confidence: typeof row.confidence === 'number' ? row.confidence : 0,
    riskLevel: (row.risk_level as UnifiedSavedRecommendation['riskLevel']) ?? null,
    actions: Array.isArray(row.actions) ? (row.actions as AIAction[]) : [],
    sourceSurface: (row.source_surface as string) ?? 'unknown',
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    expiresAt: row.expires_at ? new Date(row.expires_at as string).getTime() : null,
    isArchived: (row.is_archived as boolean) ?? false,
    status: (row.status as SavedRecommendationStatus) ?? 'saved',
    isCommissionerRec: (row.is_commissioner_rec as boolean) ?? false,
    payloadHash: (row.payload_hash as string | null) ?? null,
  }
}

// ─── Hash helper ───────────────────────────────────────────────────────────────

/** Lightweight deterministic hash of a payload — used for stale-detection. */
export function hashPayload(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload, Object.keys(payload).sort())
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash >>>= 0
  }
  return hash.toString(16)
}

// ─── Save ──────────────────────────────────────────────────────────────────────

/**
 * Persist a new recommendation. Returns the created record or null on failure.
 */
export async function saveRecommendation(
  input: SaveRecommendationInput,
): Promise<UnifiedSavedRecommendation | null> {
  const db = getServiceClient()
  if (!db) return null

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const row = {
    id,
    user_id: input.userId,
    league_id: input.leagueId ?? null,
    sport: input.sport,
    league_type: input.leagueType,
    title: input.title,
    summary: input.summary,
    recommendation_type: input.recommendationType,
    recommendation_payload: input.recommendationPayload,
    explanation: input.explanation,
    confidence: input.confidence ?? 0,
    risk_level: input.riskLevel ?? null,
    actions: input.actions ?? [],
    source_surface: input.sourceSurface,
    created_at: now,
    updated_at: now,
    expires_at: input.expiresAt ?? null,
    is_archived: false,
    status: 'saved' as SavedRecommendationStatus,
    is_commissioner_rec: input.isCommissionerRec ?? false,
    payload_hash: hashPayload(input.recommendationPayload),
  }

  const { data, error } = await db
    .from('saved_recommendations')
    .insert(row)
    .select()
    .maybeSingle()

  if (error || !data) {
    console.error('[SavedRecsService] save failed:', error?.message)
    return null
  }

  return mapRow(data as Record<string, unknown>)
}

// ─── Unsave / Delete ────────────────────────────────────────────────────────────

/**
 * Permanently delete a saved recommendation. Returns true on success.
 */
export async function unsaveRecommendation(id: string, userId: string): Promise<boolean> {
  const db = getServiceClient()
  if (!db) return false

  const { error } = await db
    .from('saved_recommendations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[SavedRecsService] delete failed:', error.message)
    return false
  }
  return true
}

// ─── List ──────────────────────────────────────────────────────────────────────

/**
 * Fetch saved recommendations for a user with optional filters.
 */
export async function listSavedRecommendations(
  opts: ListSavedRecommendationsOptions,
): Promise<{ items: UnifiedSavedRecommendation[]; total: number }> {
  const db = getServiceClient()
  if (!db) return { items: [], total: 0 }

  const {
    userId,
    leagueId,
    sport,
    recommendationType,
    status,
    isArchived = false,
    limit = 24,
    offset = 0,
  } = opts

  let query = db
    .from('saved_recommendations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_archived', isArchived)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (leagueId) query = query.eq('league_id', leagueId)
  if (sport && sport !== 'all') query = query.eq('sport', sport)
  if (recommendationType) query = query.eq('recommendation_type', recommendationType)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error || !data) {
    console.error('[SavedRecsService] list failed:', error?.message)
    return { items: [], total: 0 }
  }

  return {
    items: (data as Record<string, unknown>[]).map(mapRow),
    total: count ?? 0,
  }
}

// ─── Get Single ────────────────────────────────────────────────────────────────

/**
 * Fetch a single saved recommendation by ID. Always verifies user ownership.
 */
export async function getSavedRecommendationById(
  id: string,
  userId: string,
): Promise<UnifiedSavedRecommendation | null> {
  const db = getServiceClient()
  if (!db) return null

  const { data, error } = await db
    .from('saved_recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as Record<string, unknown>)
}

// ─── Update Status ─────────────────────────────────────────────────────────────

/**
 * Update the status of a saved recommendation.
 * e.g. mark as acted_on, dismissed, stale, or revert to saved.
 */
export async function updateRecommendationStatus(
  id: string,
  userId: string,
  status: SavedRecommendationStatus,
): Promise<boolean> {
  const db = getServiceClient()
  if (!db) return false

  const { error } = await db
    .from('saved_recommendations')
    .update({ status })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[SavedRecsService] updateStatus failed:', error.message)
    return false
  }
  return true
}

// ─── Archive ───────────────────────────────────────────────────────────────────

/**
 * Archive or un-archive a saved recommendation.
 */
export async function archiveRecommendation(
  id: string,
  userId: string,
  archive = true,
): Promise<boolean> {
  const db = getServiceClient()
  if (!db) return false

  const { error } = await db
    .from('saved_recommendations')
    .update({ is_archived: archive, status: archive ? 'dismissed' : 'saved' })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[SavedRecsService] archive failed:', error.message)
    return false
  }
  return true
}

// ─── Stale-check ───────────────────────────────────────────────────────────────

/**
 * Compare a saved recommendation's payload hash against a fresh Chimmy payload.
 * Returns true when the recommendation is considered stale (material change detected).
 */
export function isRecommendationStale(
  saved: UnifiedSavedRecommendation,
  freshPayload: Record<string, unknown>,
): boolean {
  if (!saved.payloadHash) return false
  const freshHash = hashPayload(freshPayload)
  return freshHash !== saved.payloadHash
}

/**
 * Mark a saved recommendation as stale (server-side, e.g. from a background check).
 */
export async function markRecommendationStale(id: string, userId: string): Promise<boolean> {
  return updateRecommendationStatus(id, userId, 'stale')
}

// ─── Commissioner list ─────────────────────────────────────────────────────────

/**
 * Fetch commissioner-specific saved recommendations for a league.
 * Requires the caller to have verified commissioner role before calling.
 */
export async function listCommissionerSavedRecommendations(
  userId: string,
  leagueId: string,
  limit = 20,
): Promise<UnifiedSavedRecommendation[]> {
  const db = getServiceClient()
  if (!db) return []

  const { data, error } = await db
    .from('saved_recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .eq('is_commissioner_rec', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(mapRow)
}
