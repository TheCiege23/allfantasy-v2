/**
 * PROMPT 149 — Personalized nudge service: applies retention rules with
 * anti-spam (max per day, cooldown after dismiss) and persistence of dismissals.
 */

import { prisma } from "@/lib/prisma"
import { getAllRetentionNudges } from "./RetentionRulesService"
import type { RetentionNudge } from "./types"

const MAX_NUDGES_RETURNED = 5
const DISMISS_COOLDOWN_HOURS = 24
const DISMISS_TTL_DAYS = 45
const MAX_DISMISSED_ENTRIES = 200
const MAX_PER_TYPE: Partial<Record<RetentionNudge["type"], number>> = {
  unfinished_reminder: 2,
  creator_recommendation: 1,
  sport_season_prompt: 1,
}
const SAFE_HREF_PREFIXES = [
  "/dashboard",
  "/feed",
  "/onboarding/funnel",
  "/leagues",
  "/chimmy",
  "/creators",
  "/app",
] as const

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
  if (!Number.isFinite(at)) return false
  const now = Date.now()
  return (now - at) / (60 * 60 * 1000) < hours
}

function sanitizeHref(href: string): string {
  if (!href || typeof href !== "string") return "/dashboard"
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  if (!href.startsWith("/")) return "/dashboard"
  if (SAFE_HREF_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))) {
    return href
  }
  return "/dashboard"
}

function applyAntiSpamLimits(nudges: RetentionNudge[]): RetentionNudge[] {
  const seenIds = new Set<string>()
  const perTypeCount = new Map<RetentionNudge["type"], number>()
  const out: RetentionNudge[] = []

  for (const nudge of nudges) {
    if (seenIds.has(nudge.id)) continue
    const typeCount = perTypeCount.get(nudge.type) ?? 0
    const typeCap = MAX_PER_TYPE[nudge.type] ?? Number.POSITIVE_INFINITY
    if (typeCount >= typeCap) continue

    seenIds.add(nudge.id)
    perTypeCount.set(nudge.type, typeCount + 1)
    out.push({ ...nudge, href: sanitizeHref(nudge.href) })
    if (out.length >= MAX_NUDGES_RETURNED) break
  }

  return out
}

function pruneDismissedMap(entries: Record<string, string>): Record<string, string> {
  const cutoff = Date.now() - DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000
  const valid = Object.entries(entries).filter(([, iso]) => {
    const time = new Date(iso).getTime()
    return Number.isFinite(time) && time >= cutoff
  })
  valid.sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
  return Object.fromEntries(valid.slice(0, MAX_DISMISSED_ENTRIES))
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

  return applyAntiSpamLimits(filtered)
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

    const current = pruneDismissedMap(getDismissedMap(profile ?? null))
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
