/**
 * AI Action Logger
 * Writes lifecycle telemetry for AI actions and persists saved recommendations
 * to Supabase. All writes are fire-and-forget — failures are logged to console
 * and never throw to the caller.
 *
 * Import shape:
 *   import { logAIActionEvent, saveAIRecommendation, ... } from '@/lib/chimmy-actions'
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { AIActionEvent, SavedAIRecommendation } from './AIActionModel'

// ─── Event Logger ───────────────────────────────────────────────────────────────

/**
 * Log an AI action lifecycle event (shown, clicked, confirmed, completed, etc.).
 * Silently no-ops when Supabase is not configured.
 */
export async function logAIActionEvent(event: AIActionEvent): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    await supabase.from('ai_action_events').insert({
      id: event.id,
      action_type: event.actionType,
      surface: event.surface,
      user_id: event.userId,
      league_id: event.leagueId ?? null,
      team_id: event.teamId ?? null,
      sport: event.sport ?? null,
      event: event.event,
      timestamp: new Date(event.timestamp).toISOString(),
      duration_ms: event.durationMs ?? null,
      metadata: event.metadata ?? null,
    })
  } catch {
    // Non-critical — swallow logging failures silently
  }
}

// ─── Save Recommendation ────────────────────────────────────────────────────────

/**
 * Persist a saved AI recommendation so the user can restore and act on it later.
 * Returns the saved record's ID, or null on failure.
 */
export async function saveAIRecommendation(
  rec: SavedAIRecommendation,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  try {
    const { data, error } = await supabase.from('ai_saved_recommendations').insert({
      id: rec.id,
      user_id: rec.userId,
      league_id: rec.leagueId ?? null,
      sport: rec.sport,
      league_type: rec.leagueType,
      surface: rec.surface,
      recommendation_text: rec.recommendationText,
      action: rec.action,
      saved_at: new Date(rec.savedAt).toISOString(),
      expires_at: rec.expiresAt ? new Date(rec.expiresAt).toISOString() : null,
      acted_on: rec.actedOn ?? false,
      acted_on_at: rec.actedOnAt ? new Date(rec.actedOnAt).toISOString() : null,
    })

    if (error) {
      console.error('[AIActionLogger] saveAIRecommendation failed:', error.message)
      return null
    }

    // Insert returns an array; grab the first item's id if present
    const inserted = Array.isArray(data) ? (data as Array<{ id?: string }>)[0] : null
    return inserted?.id ?? rec.id
  } catch {
    return null
  }
}

// ─── Restore Recommendation ─────────────────────────────────────────────────────

/**
 * Fetch a saved recommendation by ID. Returns null when not found or on error.
 */
export async function restoreSavedAIRecommendation(
  id: string,
): Promise<SavedAIRecommendation | null> {
  if (!isSupabaseConfigured) return null

  try {
    const { data, error } = await (
      supabase
        .from('ai_saved_recommendations')
        .select('*')
        .eq('id', id)
        .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
    )

    if (error || !data) return null

    return mapRowToRecommendation(data)
  } catch {
    return null
  }
}

// ─── List User Recommendations ──────────────────────────────────────────────────

/**
 * Fetch all saved recommendations for a user, most recent first.
 */
export async function getSavedRecommendations(
  userId: string,
  limit = 20,
): Promise<SavedAIRecommendation[]> {
  if (!isSupabaseConfigured) return []

  try {
    const { data, error } = await (
      supabase
        .from('ai_saved_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false })
        .limit(limit) as unknown as Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>
    )

    if (error || !data) return []

    return data.map(mapRowToRecommendation)
  } catch {
    return []
  }
}

// ─── Mark As Acted On ───────────────────────────────────────────────────────────

/**
 * Mark a saved recommendation as acted on so it can be archived in the UI.
 */
export async function markRecommendationActedOn(id: string): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    await supabase
      .from('ai_saved_recommendations')
      .update({ acted_on: true, acted_on_at: new Date().toISOString() })
      .eq('id', id)
  } catch {
    // Swallow
  }
}

// ─── Row Mapper ─────────────────────────────────────────────────────────────────

function mapRowToRecommendation(row: Record<string, unknown>): SavedAIRecommendation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    leagueId: (row.league_id as string | null) ?? null,
    sport: row.sport as string,
    leagueType: row.league_type as string,
    surface: row.surface as string,
    recommendationText: row.recommendation_text as string,
    action: row.action as SavedAIRecommendation['action'],
    savedAt: new Date(row.saved_at as string).getTime(),
    expiresAt: row.expires_at ? new Date(row.expires_at as string).getTime() : null,
    actedOn: (row.acted_on as boolean) ?? false,
    actedOnAt: row.acted_on_at ? new Date(row.acted_on_at as string).getTime() : null,
  }
}
