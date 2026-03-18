/**
 * Push Notifications (PROMPT 304) — types.
 * Web push for AI alerts, chat mentions, league updates.
 */

/** Payload sent to the service worker (shown in browser notification). */
export interface PushPayload {
  title: string
  body?: string
  /** Click opens this URL (absolute or path). */
  href?: string
  /** Optional tag to replace same-tag notifications. */
  tag?: string
  /** Notification type for analytics. */
  type?: string
}

/** Subscription as stored and as needed by web-push. */
export interface PushSubscriptionRecord {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
  createdAt: Date
}

/** Client sends this when subscribing (PushSubscription JSON). */
export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export interface SendPushResult {
  ok: boolean
  subscriptionId?: string
  error?: string
}
