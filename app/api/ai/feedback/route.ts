/**
 * POST /api/ai/feedback
 *
 * Accepts a thumbs-up or thumbs-down rating for any AI answer.
 * Called by the TeachingAnswerCard `onFeedback` callback.
 *
 * Body:
 *   feature    — which AI feature: "wc_chimmy" | "wc_explain_bracket" | etc.
 *   rating     — "helpful" | "not_helpful"
 *   resultKey  — optional AiResult.resultKey to tie feedback to a cached answer
 *   promptText — optional prompt text (stored only as a hash)
 *   sport      — optional sport context
 *
 * Returns 200 { ok: true } on success.
 * Returns 400 on invalid payload.
 * Returns 401 when not authenticated.
 * Returns 500 on DB error (non-fatal — client can ignore).
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { saveAiFeedback, type AiFeedbackRating } from "@/lib/ai/aiFeedback"

const VALID_RATINGS = new Set<string>(["helpful", "not_helpful"])
const VALID_FEATURES = new Set<string>([
  "wc_chimmy",
  "wc_explain_bracket",
  "wc_commissioner",
  "wc_matchup",
  "bracket_ai",
  "draft_advisor",
  "commissioner_brain",
  "general",
  "world_cup_daily_edge_report",
])

export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Body must be an object" }, { status: 400 })
  }

  const { feature, rating, resultKey, promptText, sport } = body as Record<string, unknown>

  // ── Validate ──────────────────────────────────────────────────────────────
  if (typeof feature !== "string" || !VALID_FEATURES.has(feature)) {
    return NextResponse.json({ ok: false, error: `Invalid feature: ${feature}` }, { status: 400 })
  }

  if (typeof rating !== "string" || !VALID_RATINGS.has(rating)) {
    return NextResponse.json(
      { ok: false, error: `Invalid rating: ${rating}. Must be "helpful" or "not_helpful"` },
      { status: 400 }
    )
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const saved = await saveAiFeedback({
    userId: session.user.id,
    feature,
    rating: rating as AiFeedbackRating,
    resultKey: typeof resultKey === "string" ? resultKey : null,
    promptText: typeof promptText === "string" ? promptText : null,
    sport: typeof sport === "string" ? sport : null,
  })

  if (!saved) {
    // DB error — respond 500 but don't surface details
    return NextResponse.json({ ok: false, error: "Failed to save feedback" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: saved.id })
}
