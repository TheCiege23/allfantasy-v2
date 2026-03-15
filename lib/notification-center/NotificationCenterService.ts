/**
 * NotificationCenterService — grouping and display logic for the notification center.
 */

import type { PlatformNotification } from "@/types/platform-shared"

export type NotificationGroupKey = "today" | "yesterday" | "earlier"

export function getGroupKey(dateStr: string): NotificationGroupKey {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (d >= startOfToday) return "today"
  if (d >= startOfYesterday) return "yesterday"
  return "earlier"
}

export function groupNotifications(
  notifications: PlatformNotification[]
): Record<NotificationGroupKey, PlatformNotification[]> {
  const groups: Record<NotificationGroupKey, PlatformNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }
  for (const n of notifications) {
    const key = getGroupKey(n.createdAt)
    groups[key].push(n)
  }
  return groups
}

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
}
