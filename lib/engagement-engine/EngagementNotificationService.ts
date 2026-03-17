import { createPlatformNotification } from "@/lib/platform/notification-service"
import { getDeepLinkRedirect } from "@/lib/routing/DeepLinkHandler"
import type { EngagementNotificationType } from "./types"

export type ProductType = "shared" | "app" | "bracket" | "legacy"

/**
 * Sends engagement notifications (daily digest, league reminder, AI insight, weekly recap).
 * All notifications include meta.actionHref / actionLabel for deep linking when set.
 */
export async function sendDailyDigest(params: {
  userId: string
  title: string
  body?: string
  actionHref?: string
  actionLabel?: string
  leagueId?: string
}): Promise<boolean> {
  const href = params.actionHref
    ? getDeepLinkRedirect(params.actionHref, "/dashboard")
    : params.leagueId
      ? `/app/league/${params.leagueId}`
      : "/dashboard"
  return createPlatformNotification({
    userId: params.userId,
    productType: "app",
    type: "daily_digest",
    title: params.title,
    body: params.body ?? undefined,
    severity: "low",
    meta: {
      actionHref: href,
      actionLabel: params.actionLabel ?? "Open",
      leagueId: params.leagueId ?? undefined,
    },
  })
}

export async function sendLeagueReminder(params: {
  userId: string
  leagueId: string
  title: string
  body?: string
  actionLabel?: string
}): Promise<boolean> {
  const href = getDeepLinkRedirect(`/app/league/${params.leagueId}`, "/dashboard")
  return createPlatformNotification({
    userId: params.userId,
    productType: "app",
    type: "league_reminder",
    title: params.title,
    body: params.body ?? undefined,
    severity: "medium",
    meta: {
      leagueId: params.leagueId,
      actionHref: href,
      actionLabel: params.actionLabel ?? "Open league",
    },
  })
}

export async function sendAIInsight(params: {
  userId: string
  title: string
  body?: string
  actionHref?: string
  actionLabel?: string
  leagueId?: string
}): Promise<boolean> {
  const href = params.actionHref
    ? getDeepLinkRedirect(params.actionHref, "/af-legacy")
    : params.leagueId
      ? `/app/league/${params.leagueId}`
      : "/af-legacy"
  return createPlatformNotification({
    userId: params.userId,
    productType: "legacy",
    type: "ai_insight",
    title: params.title,
    body: params.body ?? undefined,
    severity: "low",
    meta: {
      actionHref: href,
      actionLabel: params.actionLabel ?? "View",
      leagueId: params.leagueId ?? undefined,
    },
  })
}

export async function sendWeeklyRecap(params: {
  userId: string
  title: string
  body: string
  actionHref: string
  actionLabel: string
  meta?: Record<string, unknown>
}): Promise<boolean> {
  const href = getDeepLinkRedirect(params.actionHref, "/dashboard")
  return createPlatformNotification({
    userId: params.userId,
    productType: "shared",
    type: "weekly_recap",
    title: params.title,
    body: params.body,
    severity: "low",
    meta: {
      actionHref: href,
      actionLabel: params.actionLabel,
      ...params.meta,
    },
  })
}
