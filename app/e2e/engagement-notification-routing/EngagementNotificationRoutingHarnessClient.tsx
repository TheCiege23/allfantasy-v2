"use client"

import { useMemo, useState } from "react"
import { NotificationPanelView, type NotificationPanelState } from "@/components/notifications/NotificationPanel"
import type { PlatformNotification } from "@/types/platform-shared"

function buildNotifications(): PlatformNotification[] {
  const createdAt = new Date().toISOString()
  return [
    {
      id: "eng-daily",
      type: "daily_digest",
      title: "Daily digest ready",
      body: "See today's updates and recommended tools.",
      product: "shared",
      read: false,
      createdAt,
      meta: {
        actionHref: "/trade-analyzer",
        actionLabel: "Open digest",
      },
    },
    {
      id: "eng-league",
      type: "league_reminder",
      title: "League lineup reminder",
      body: "Set your lineup before lock.",
      product: "app",
      read: false,
      createdAt,
      meta: {
        leagueId: "league-123",
      },
    },
    {
      id: "eng-ai",
      type: "ai_insight",
      title: "AI insight unlocked",
      body: "New AI recommendation is available.",
      product: "legacy",
      read: false,
      createdAt,
      meta: {
        actionHref: "/chimmy",
        actionLabel: "Open AI",
      },
    },
    {
      id: "eng-weekly",
      type: "weekly_recap",
      title: "Weekly recap summary",
      body: "Your week across leagues and tools is ready.",
      product: "shared",
      read: false,
      createdAt,
      meta: {
        actionHref: "/tools-hub",
        actionLabel: "Open recap",
      },
    },
    {
      id: "eng-blocked",
      type: "weekly_recap",
      title: "Unsafe link blocked",
      body: "This should safely redirect inside the app.",
      product: "shared",
      read: false,
      createdAt,
      meta: {
        actionHref: "//evil.example/phish",
        actionLabel: "Blocked link",
      },
    },
  ]
}

export default function EngagementNotificationRoutingHarnessClient() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>(() => buildNotifications())

  const state = useMemo<NotificationPanelState>(
    () => ({
      notifications,
      loading: false,
      error: null,
      markAsRead: async (notificationId: string) => {
        setNotifications((prev) =>
          prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
        )
      },
      markAllAsRead: async () => {
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
      },
      refresh: async () => {},
    }),
    [notifications]
  )

  return (
    <main className="min-h-screen bg-[#0b1020] p-6 text-white">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">Engagement Notification Routing Harness</h1>
        <p className="text-sm text-white/70">
          Validates deep-link routing for daily, league reminder, AI insight, and weekly recap notifications.
        </p>
        <NotificationPanelView state={state} showFooter={false} />
      </div>
    </main>
  )
}
