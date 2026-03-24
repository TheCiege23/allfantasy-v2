/**
 * NotificationReadStateService — mark as read / mark all as read API contract.
 * Actual API calls are in useNotifications; this module documents endpoints and optimistic update behavior.
 */

export const NOTIFICATIONS_ENDPOINT = "/api/shared/notifications"
export const NOTIFICATIONS_READ_ENDPOINT = NOTIFICATIONS_ENDPOINT
export const NOTIFICATIONS_READ_ALL_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/read-all`

export function getNotificationsEndpoint(limit: number): string {
  const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 100)
  return `${NOTIFICATIONS_ENDPOINT}?limit=${safeLimit}`
}

/** Path for PATCH single notification read: /api/shared/notifications/[notificationId]/read */
export function getNotificationReadEndpoint(notificationId: string): string {
  return `${NOTIFICATIONS_ENDPOINT}/${encodeURIComponent(notificationId)}/read`
}
