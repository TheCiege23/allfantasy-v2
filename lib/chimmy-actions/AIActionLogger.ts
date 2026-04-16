/**
 * AI Action Logger
 * Writes lifecycle telemetry for AI actions and persists saved recommendations
 * through internal API routes backed by Neon/Prisma.
 *
 * Import shape:
 *   import { logAIActionEvent, saveAIRecommendation, ... } from '@/lib/chimmy-actions'
 */

import type { AIActionEvent, SavedAIRecommendation } from './AIActionModel'

function resolveInternalApiUrl(path: string): string {
  if (typeof window !== 'undefined') return path
  const base =
    process.env.APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    'http://localhost:3000'
  return `${base.replace(/\/$/, '')}${path}`
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

// ─── Event Logger ───────────────────────────────────────────────────────────────

/**
 * Log an AI action lifecycle event (shown, clicked, confirmed, completed, etc.).
 * Silently no-ops when Supabase is not configured.
 */
export async function logAIActionEvent(event: AIActionEvent): Promise<void> {
  try {
    await fetch(resolveInternalApiUrl('/api/ai/actions/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(event),
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
  try {
    const response = await fetch(resolveInternalApiUrl('/api/ai/actions/recommendations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(rec),
    })
    if (!response.ok) {
      console.error('[AIActionLogger] saveAIRecommendation failed:', response.status)
      return null
    }
    const payload = await parseJsonSafe<{ id?: string }>(response)
    return payload?.id ?? rec.id
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
  try {
    const response = await fetch(resolveInternalApiUrl(`/api/ai/actions/recommendations/${encodeURIComponent(id)}`), {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = await parseJsonSafe<{ row?: SavedAIRecommendation | null }>(response)
    return payload?.row ?? null
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
  void userId

  try {
    const response = await fetch(
      resolveInternalApiUrl(`/api/ai/actions/recommendations?limit=${encodeURIComponent(String(limit))}`),
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }
    )
    if (!response.ok) return []
    const payload = await parseJsonSafe<{ rows?: SavedAIRecommendation[] }>(response)
    return Array.isArray(payload?.rows) ? payload.rows : []
  } catch {
    return []
  }
}

// ─── Mark As Acted On ───────────────────────────────────────────────────────────

/**
 * Mark a saved recommendation as acted on so it can be archived in the UI.
 */
export async function markRecommendationActedOn(id: string): Promise<void> {
  try {
    await fetch(resolveInternalApiUrl(`/api/ai/actions/recommendations/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      credentials: 'same-origin',
    })
  } catch {
    // Swallow
  }
}
