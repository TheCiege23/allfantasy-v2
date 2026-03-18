/**
 * Weekly summary email flow — drive engagement via weekly recap email.
 */

import { prisma } from "@/lib/prisma"
import { getActivitySummary } from "@/lib/engagement-engine/UserActivityTracker"
import { getResendClient } from "@/lib/resend-client"
import { getBaseUrl } from "@/lib/get-base-url"
import { buildWeeklySummaryHtml } from "../templates"
import type { WeeklySummaryPayload, EmailFlowSendResult, EmailFlowBatchResult } from "../types"

const DEFAULT_CTA_HREF = "/dashboard"
const DEFAULT_CTA_LABEL = "Open dashboard"

/**
 * Send a single weekly summary email.
 */
export async function sendWeeklySummaryEmail(
  payload: WeeklySummaryPayload
): Promise<EmailFlowSendResult> {
  const { client, fromEmail } = getResendClient()
  const html = buildWeeklySummaryHtml({
    userName: payload.userName,
    leagueViews: payload.leagueViews,
    bracketViews: payload.bracketViews,
    aiUses: payload.aiUses,
    ctaHref: payload.ctaHref || DEFAULT_CTA_HREF,
    ctaLabel: payload.ctaLabel || DEFAULT_CTA_LABEL,
  })

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: "Your weekly summary — AllFantasy.ai",
      html,
    })
    if (result.error) {
      return { ok: false, to: payload.to, error: result.error.message ?? "Send failed" }
    }
    return { ok: true, to: payload.to }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { ok: false, to: payload.to, error: message }
  }
}

/**
 * Get user IDs with engagement in the last N days (for weekly batch).
 */
export async function getEligibleWeeklySummaryUserIds(lookbackDays: number = 7): Promise<string[]> {
  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)

  const events = await (prisma as any).engagementEvent
    .findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    })
    .catch(() => [])

  return [...new Set((events as { userId: string }[]).map((e) => e.userId))]
}

/**
 * Resolve email and optional name for an app user. Returns null if no email.
 */
async function getEmailForUser(userId: string): Promise<{ email: string; userName?: string | null } | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true, displayName: true, profile: { select: { displayName: true } } },
  })
  if (!user?.email?.trim()) return null
  const userName = user.profile?.displayName ?? user.displayName ?? null
  return { email: user.email.trim(), userName }
}

/**
 * Check if user has opted out of weekly digest (legacy EmailPreference.weeklyDigest).
 * When no preference row exists, we allow send (growth default).
 */
async function isWeeklyDigestAllowed(email: string): Promise<boolean> {
  const pref = await prisma.emailPreference.findUnique({
    where: { email: email.toLowerCase() },
    select: { weeklyDigest: true },
  })
  if (!pref) return true
  return pref.weeklyDigest === true
}

/**
 * Run the weekly summary flow for all eligible users: engagement in last 7 days,
 * has email, and (where applicable) weekly digest not opted out.
 */
export async function runWeeklySummaryFlow(options: {
  lookbackDays?: number
  limit?: number
  baseUrl?: string
}): Promise<EmailFlowBatchResult> {
  const lookbackDays = options.lookbackDays ?? 7
  const limit = Math.min(options.limit ?? 500, 1000)
  const baseUrl = options.baseUrl ?? getBaseUrl().replace(/\/$/, "")

  const userIds = await getEligibleWeeklySummaryUserIds(lookbackDays)
  const toProcess = userIds.slice(0, limit)

  let sent = 0
  let failed = 0
  let skipped = 0
  const errors: Array<{ to: string; error: string }> = []

  for (const userId of toProcess) {
    const contact = await getEmailForUser(userId)
    if (!contact) {
      skipped++
      continue
    }
    const allowed = await isWeeklyDigestAllowed(contact.email)
    if (!allowed) {
      skipped++
      continue
    }

    const since = new Date()
    since.setDate(since.getDate() - lookbackDays)
    const summary = await getActivitySummary(userId, since)

    const result = await sendWeeklySummaryEmail({
      to: contact.email,
      userName: contact.userName,
      leagueViews: summary.leagueViews,
      bracketViews: summary.bracketViews,
      aiUses: summary.aiUses,
      ctaHref: `${baseUrl}${DEFAULT_CTA_HREF}`,
      ctaLabel: DEFAULT_CTA_LABEL,
    })

    if (result.ok) {
      sent++
    } else {
      failed++
      if (result.error) errors.push({ to: contact.email, error: result.error })
    }

    await new Promise((r) => setTimeout(r, 80))
  }

  return { sent, failed, skipped, errors }
}
