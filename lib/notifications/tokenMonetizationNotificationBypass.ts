import { isTokenNotificationBypassUserId } from "@/lib/dev-admin/access"
import type { NotificationCategoryId } from "@/lib/notification-settings/types"

export type TokenMonetizationBypassParams = {
  type: string
  title: string
  body?: string
  category: NotificationCategoryId
}

/**
 * Suppress unified notifications that look like AI token monetization nudges for admin / allowlisted users.
 */
export function shouldSuppressTokenMonetizationNotification(
  userId: string,
  params: TokenMonetizationBypassParams
): boolean {
  if (!isTokenNotificationBypassUserId(userId)) return false
  const blob = `${params.type} ${params.title} ${params.body ?? ""}`.toLowerCase()
  if (!/\btoken(s)?\b/.test(blob)) return false
  if (
    /\b(insufficient|buy|purchase|pack|balance|reload|top-up|top up|get more|credit(s)?|spend|charge)\b/.test(blob)
  ) {
    return true
  }
  if (params.category === "ai_alerts") return true
  if (params.category === "system_account" && /\b(balance|purchase|buy|token)\b/.test(blob)) return true
  return false
}
