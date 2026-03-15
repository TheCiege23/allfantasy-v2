/**
 * NotificationReadStateService — mark as read / mark all as read API contract.
 * Actual API calls are in useNotifications; this module documents endpoints and optimistic update behavior.
 */

export const NOTIFICATIONS_READ_ENDPOINT = "/api/shared/notifications"
export const NOTIFICATIONS_READ_ALL_ENDPOINT = "/api/shared/notifications/read-all"

/** Path for PATCH single notification read: /api/shared/notifications/[notificationId]/read */
export function getNotificationReadEndpoint(notificationId: string): string {
  return `${NOTIFICATIONS_READ_ENDPOINT}/${encodeURIComponent(notificationId)}/read`
}
