/**
 * PROMPT 149 — Personalized nudge service: applies retention rules with
 * anti-spam (max per day, cooldown after dismiss) and persistence of dismissals.
 */

import { prisma } from "@/lib/prisma"
import { getAllRetentionNudges } from "./RetentionRulesService"
import type { RetentionNudge } from "./types"

const MAX_NUDGES_RETURNED = 5
const DISMISS_COOLDOWN_HOURS = 24

function getDismissedMap(profile: { retentionNudgeDismissedAt?: unknown } | null): Record<string, string> {
  const raw = profile?.retentionNudgeDismissedAt
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") out[k] = v
    }
    return out
  }
  return {}
}

function isWithinCooldown(dismissedAtIso: string, hours: number): boolean {
  const at = new Date(dismissedAtIso).getTime()
  const now = Date.now()
  return (now - at) / (60 * 60 * 1000) < hours
}

/**
 * Returns personalized nudges for the user after applying:
 * - Dismissed filter (exclude if dismissed within cooldown)
 * - Anti-spam: limit to MAX_NUDGES_RETURNED
 */
export async function getNudges(userId: string): Promise<RetentionNudge[]> {
  const [profile, allNudges] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { retentionNudgeDismissedAt: true },
    }),
    getAllRetentionNudges(userId),
  ])

  const dismissed = getDismissedMap(profile ?? null)

  const filtered = allNudges.filter((n) => {
    const at = dismissed[n.id]
    if (!at) return true
    if (isWithinCooldown(at, DISMISS_COOLDOWN_HOURS)) return false
    return true
  })

  return filtered.slice(0, MAX_NUDGES_RETURNED)
}

/**
 * Records dismissal of a nudge (persists to UserProfile.retentionNudgeDismissedAt).
 */
export async function dismissNudge(
  userId: string,
  nudgeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { retentionNudgeDismissedAt: true },
    })

    const current = getDismissedMap(profile ?? null)
    const next = { ...current, [nudgeId]: new Date().toISOString() }

    await prisma.userProfile.upsert({
      where: { userId },
      update: { retentionNudgeDismissedAt: next },
      create: {
        userId,
        retentionNudgeDismissedAt: next,
      },
    })
    return { ok: true }
  } catch (e) {
    console.error("[PersonalizedNudgeService] dismissNudge error:", e)
    return { ok: false, error: "Failed to dismiss" }
  }
}
