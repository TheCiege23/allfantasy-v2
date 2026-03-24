import "server-only"
import { createPlatformNotification } from "@/lib/platform/notification-service"
import { getSettingsProfile } from "@/lib/user-settings"
import { resolveNotificationPreferences } from "@/lib/notification-settings/NotificationPreferenceResolver"
import { getDeliveryMethodAvailability } from "@/lib/notification-settings/DeliveryMethodResolver"
import type { NotificationCategoryId, NotificationPreferences } from "@/lib/notification-settings/types"
import { sendNotificationEmail } from "@/lib/resend-client"
import { sendSms } from "@/lib/twilio-client"
import { sendPushToUser, isPushCategory } from "@/lib/push-notifications"
import { retryWithBackoff } from "@/lib/error-handling"

export type DispatchNotificationParams = {
  userIds: string[]
  category: NotificationCategoryId
  productType?: "shared" | "app" | "bracket" | "legacy"
  type: string
  title: string
  body?: string
  actionHref?: string
  actionLabel?: string
  meta?: Record<string, unknown>
  severity?: "low" | "medium" | "high"
}

/**
 * Single entry point for notifications: in-app + optional email and SMS
 * per user preferences and delivery availability (email/phone).
 */
export async function dispatchNotification(params: DispatchNotificationParams): Promise<void> {
  const {
    userIds,
    category,
    productType = "app",
    type,
    title,
    body,
    actionHref,
    actionLabel,
    meta,
    severity = "medium",
  } = params

  for (const userId of userIds) {
    try {
      const profile = await getSettingsProfile(userId)
      if (!profile) continue

      const prefs = resolveNotificationPreferences(
        profile.notificationPreferences as NotificationPreferences | null
      )
      if (!prefs.globalEnabled) continue

      const catPrefs = prefs.categories?.[category]
      if (!catPrefs?.enabled) continue

      const availability = getDeliveryMethodAvailability({
        hasEmail: !!profile.email,
        phoneVerified: !!profile.phoneVerifiedAt,
      })

      if (catPrefs.inApp && availability.inApp) {
        await createPlatformNotification({
          userId,
          productType,
          type,
          title,
          body: body ?? undefined,
          severity,
          meta: {
            ...(meta ?? {}),
            ...(actionHref && { actionHref, actionLabel: actionLabel ?? "Open" }),
          },
        })
      }

      if (catPrefs.email && availability.email && profile.email) {
        try {
          await retryWithBackoff(
            async () => {
              const result = await sendNotificationEmail({
                to: profile.email!,
                subject: title,
                bodyHtml: body ?? title,
                actionHref,
                actionLabel: actionLabel ?? "Open",
              })
              if (!result.ok) {
                const err = new Error(result.error ?? "Email send failed") as Error & { status?: number }
                err.status = 503
                throw err
              }
            },
            { maxAttempts: 2, baseMs: 500, maxMs: 2000 }
          )
        } catch (e) {
          console.warn("[NotificationDispatcher] email send failed after retry for user", userId, e)
        }
      }

      if (catPrefs.sms && availability.sms && profile.phone) {
        const smsBody = body ? `${title}\n${body}` : title
        await sendSms(profile.phone, smsBody.slice(0, 320))
      }

      if (catPrefs.inApp && availability.inApp && isPushCategory(category)) {
        sendPushToUser(userId, {
          title,
          body: body ?? undefined,
          href: actionHref,
          tag: `notif-${category}-${meta?.leagueId ?? "global"}`,
          type,
        }).catch((e) => console.error("[NotificationDispatcher] push error for user", userId, e))
      }
    } catch (e) {
      console.error("[NotificationDispatcher] dispatch error for user", userId, e)
    }
  }
}
