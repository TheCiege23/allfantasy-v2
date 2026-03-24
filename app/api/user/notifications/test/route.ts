import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { getSettingsProfile } from "@/lib/user-settings"
import { createPlatformNotification } from "@/lib/platform/notification-service"
import { sendNotificationEmail } from "@/lib/resend-client"
import { sendSms } from "@/lib/twilio-client"
import {
  NOTIFICATION_CATEGORY_IDS,
  resolveNotificationPreferences,
  getDeliveryMethodAvailability,
  type NotificationCategoryId,
  type NotificationPreferences,
} from "@/lib/notification-settings"

export const runtime = "nodejs"

function isNotificationCategoryId(value: string): value is NotificationCategoryId {
  return (NOTIFICATION_CATEGORY_IDS as string[]).includes(value)
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`notification-test:${userId}:${ip}`, 6, 120_000)
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Please wait before sending another test notification." }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const categoryCandidate = String(body?.category ?? "system_account").trim()
  const category = isNotificationCategoryId(categoryCandidate)
    ? categoryCandidate
    : "system_account"

  const channels = body?.channels as { inApp?: boolean; email?: boolean; sms?: boolean } | undefined
  const requested = {
    inApp: channels?.inApp !== false,
    email: channels?.email === true,
    sms: channels?.sms === true,
  }

  const profile = await getSettingsProfile(userId)
  if (!profile) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 })
  }

  const prefs = resolveNotificationPreferences(
    profile.notificationPreferences as NotificationPreferences | null
  )
  const catPrefs = prefs.categories?.[category] ?? {
    enabled: true,
    inApp: true,
    email: true,
    sms: false,
  }
  const availability = getDeliveryMethodAvailability({
    hasEmail: !!profile.email,
    phoneVerified: !!profile.phoneVerifiedAt,
  })

  const blockedReasons: string[] = []
  if (prefs.globalEnabled === false) blockedReasons.push("global_disabled")
  if (catPrefs.enabled === false) blockedReasons.push("category_disabled")

  let inAppSent = false
  let emailSent = false
  let smsSent = false

  if (requested.inApp && availability.inApp && prefs.globalEnabled !== false && catPrefs.enabled && catPrefs.inApp) {
    inAppSent = await createPlatformNotification({
      userId,
      productType: "shared",
      type: "test_notification",
      title: "Test notification",
      body: `Your ${category.replace(/_/g, " ")} settings are working.`,
      severity: "low",
      meta: {
        category,
        actionHref: "/settings?tab=notifications",
        actionLabel: "Open settings",
      },
    })
  } else if (requested.inApp && !availability.inApp) {
    blockedReasons.push("inapp_unavailable")
  } else if (requested.inApp && !catPrefs.inApp) {
    blockedReasons.push("inapp_disabled")
  }

  if (requested.email && availability.email && profile.email && prefs.globalEnabled !== false && catPrefs.enabled && catPrefs.email) {
    const result = await sendNotificationEmail({
      to: profile.email,
      subject: "AllFantasy test notification",
      bodyHtml: `Your ${category.replace(/_/g, " ")} email notifications are configured.`,
      actionHref: "/settings?tab=notifications",
      actionLabel: "Open settings",
    })
    emailSent = result.ok
    if (!result.ok) blockedReasons.push("email_send_failed")
  } else if (requested.email && !availability.email) {
    blockedReasons.push("email_unavailable")
  } else if (requested.email && !catPrefs.email) {
    blockedReasons.push("email_disabled")
  }

  if (requested.sms && availability.sms && profile.phone && prefs.globalEnabled !== false && catPrefs.enabled && catPrefs.sms) {
    smsSent = await sendSms(
      profile.phone,
      `AllFantasy test notification: ${category.replace(/_/g, " ")} SMS is configured.`
    )
    if (!smsSent) blockedReasons.push("sms_send_failed")
  } else if (requested.sms && !availability.sms) {
    blockedReasons.push("sms_unavailable")
  } else if (requested.sms && !catPrefs.sms) {
    blockedReasons.push("sms_disabled")
  }

  return NextResponse.json({
    ok: inAppSent || emailSent || smsSent,
    sent: {
      inApp: inAppSent,
      email: emailSent,
      sms: smsSent,
    },
    blockedReasons,
  })
}
