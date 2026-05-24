/**
 * Phase 5 — Chimmy intelligence feedback writer.
 *
 * Fire-and-forget persistence helper for `chimmy_intelligence_feedback`.
 * Mirrors `recordChimmyContextRun` patterns: clamp inputs, swallow errors,
 * never block or surface failures into the request path.
 *
 * Designed to be called from internal-only QA endpoints. Validation /
 * eligibility gating happens at the HTTP boundary — this writer trusts its
 * inputs and only performs structural normalization.
 */

import { prisma } from "@/lib/prisma"
import { logAiFailure } from "@/lib/error-tracking"

export type ChimmyFeedbackEventType =
  | "thumbs_up"
  | "thumbs_down"
  | "expand"
  | "collapse"
  | "dismiss"
  | "view"
  // Phase 6A — interaction analytics.
  | "manual_refresh"

export type ChimmyFeedbackReason =
  | "not_useful"
  | "incorrect"
  | "too_repetitive"
  | "other"

export type ChimmyFeedbackSurface = "rail" | "debug" | "chat"

export type ChimmyFeedbackInput = {
  userId: string
  eventType: ChimmyFeedbackEventType
  leagueId?: string | null
  cardId?: string | null
  severity?: string | null
  reason?: ChimmyFeedbackReason | null
  surface?: ChimmyFeedbackSurface | null
  cohortLabel?: string | null
}

const MAX_USER_ID = 64
const MAX_LEAGUE_ID = 64
const MAX_CARD_ID = 48
const MAX_SEVERITY = 16
const MAX_REASON = 24
const MAX_SURFACE = 32
const MAX_COHORT = 24
const MAX_EVENT_TYPE = 24

function clamp(value: string | null | undefined, max: number): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

const ALLOWED_EVENTS: ReadonlySet<ChimmyFeedbackEventType> = new Set([
  "thumbs_up",
  "thumbs_down",
  "expand",
  "collapse",
  "dismiss",
  "view",
  "manual_refresh",
])

const ALLOWED_REASONS: ReadonlySet<ChimmyFeedbackReason> = new Set([
  "not_useful",
  "incorrect",
  "too_repetitive",
  "other",
])

const ALLOWED_SURFACES: ReadonlySet<ChimmyFeedbackSurface> = new Set([
  "rail",
  "debug",
  "chat",
])

/**
 * Validate + normalize an incoming feedback event. Returns null when the
 * event is malformed (callers can use this to reject HTTP requests with
 * 400 without leaking internal validation rules).
 */
export function normalizeFeedbackInput(
  raw: ChimmyFeedbackInput
): ChimmyFeedbackInput | null {
  const userId = clamp(raw.userId, MAX_USER_ID)
  if (!userId) return null
  if (!raw.eventType || !ALLOWED_EVENTS.has(raw.eventType)) return null

  const reason =
    raw.reason && ALLOWED_REASONS.has(raw.reason) ? raw.reason : null
  const surface =
    raw.surface && ALLOWED_SURFACES.has(raw.surface) ? raw.surface : "rail"

  return {
    userId,
    eventType: clamp(raw.eventType, MAX_EVENT_TYPE) as ChimmyFeedbackEventType,
    leagueId: clamp(raw.leagueId ?? null, MAX_LEAGUE_ID),
    cardId: clamp(raw.cardId ?? null, MAX_CARD_ID),
    severity: clamp(raw.severity ?? null, MAX_SEVERITY),
    reason,
    surface,
    cohortLabel: clamp(raw.cohortLabel ?? null, MAX_COHORT),
  }
}

/**
 * Fire-and-forget feedback writer. Never rejects.
 */
export async function recordChimmyIntelligenceFeedback(
  input: ChimmyFeedbackInput
): Promise<void> {
  const normalized = normalizeFeedbackInput(input)
  if (!normalized) return
  try {
    await prisma.chimmyIntelligenceFeedback.create({
      data: {
        userId: normalized.userId,
        eventType: normalized.eventType,
        leagueId: normalized.leagueId ?? null,
        cardId: normalized.cardId ?? null,
        severity: normalized.severity ?? null,
        reason: normalized.reason ?? null,
        surface: normalized.surface ?? "rail",
        cohortLabel: normalized.cohortLabel ?? null,
      },
    })
  } catch (err) {
    try {
      logAiFailure("chimmy_feedback_write_failed", err)
    } catch {
      // swallow
    }
  }
}
