/**
 * UnreadCountResolver — compute unread count from notification list.
 */

import type { PlatformNotification } from "@/types/platform-shared"

export function getUnreadCount(notifications: PlatformNotification[]): number {
  return notifications.filter((n) => !n.read).length
}

/** Cap display count for badge (e.g. "9+"). */
export function getUnreadBadgeCount(notifications: PlatformNotification[], max = 9): number | string {
  const count = getUnreadCount(notifications)
  if (count <= max) return count
  return `${max}+`
}
