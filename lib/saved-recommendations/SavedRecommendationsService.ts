/**
 * lib/saved-recommendations/SavedRecommendationsService.ts
 *
 * CRUD + staleness + comparison service for the unified saved-recommendations system.
 * All writes are server-side only. Reads are callable from server components and
 * API routes. Never import this file from 'use client' files — use the API routes.
 *
 * NOTE: Supabase removed. saved_recommendations table not yet migrated to Neon/Prisma.
 * All operations return null/false/empty until migration is complete.
 */

import type {
  UnifiedSavedRecommendation,
  SavedRecommendationStatus,
  RecommendationCategory,
  AIAction,
} from '@/lib/chimmy-actions/AIActionModel'

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
 * NOTE: Not yet migrated to Neon/Prisma — returns null until migration complete.
 */
export async function saveRecommendation(
  _input: SaveRecommendationInput,
): Promise<UnifiedSavedRecommendation | null> {
  return null
}

// ─── Unsave / Delete ────────────────────────────────────────────────────────────

/**
 * Permanently delete a saved recommendation. Returns true on success.
 * NOTE: Not yet migrated to Neon/Prisma — returns false until migration complete.
 */
export async function unsaveRecommendation(_id: string, _userId: string): Promise<boolean> {
  return false
}

// ─── List ──────────────────────────────────────────────────────────────────────

/**
 * Fetch saved recommendations for a user with optional filters.
 * NOTE: Not yet migrated to Neon/Prisma — returns empty until migration complete.
 */
export async function listSavedRecommendations(
  _opts: ListSavedRecommendationsOptions,
): Promise<{ items: UnifiedSavedRecommendation[]; total: number }> {
  return { items: [], total: 0 }
}

// ─── Get Single ────────────────────────────────────────────────────────────────

/**
 * Fetch a single saved recommendation by ID. Always verifies user ownership.
 * NOTE: Not yet migrated to Neon/Prisma — returns null until migration complete.
 */
export async function getSavedRecommendationById(
  _id: string,
  _userId: string,
): Promise<UnifiedSavedRecommendation | null> {
  return null
}

// ─── Update Status ─────────────────────────────────────────────────────────────

/**
 * Update the status of a saved recommendation.
 * e.g. mark as acted_on, dismissed, stale, or revert to saved.
 */
/**
 * Update the status of a saved recommendation.
 * NOTE: Not yet migrated to Neon/Prisma — returns false until migration complete.
 */
export async function updateRecommendationStatus(
  _id: string,
  _userId: string,
  _status: SavedRecommendationStatus,
): Promise<boolean> {
  return false
}

// ─── Archive ───────────────────────────────────────────────────────────────────

/**
 * Archive or un-archive a saved recommendation.
 * NOTE: Not yet migrated to Neon/Prisma — returns false until migration complete.
 */
export async function archiveRecommendation(
  _id: string,
  _userId: string,
  _archive = true,
): Promise<boolean> {
  return false
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
 * NOTE: Not yet migrated to Neon/Prisma — returns empty until migration complete.
 */
export async function listCommissionerSavedRecommendations(
  _userId: string,
  _leagueId: string,
  _limit = 20,
): Promise<UnifiedSavedRecommendation[]> {
  return []
}
