import 'server-only'

import { createPlatformNotification } from '@/lib/platform/notification-service'

/**
 * Persist a single in-app notification with optional league scope and dedupe key.
 */
export async function persistUserNotification(input: {
  userId: string
  leagueId?: string | null
  type: string
  title: string
  body?: string
  severity?: 'low' | 'medium' | 'high'
  meta?: Record<string, unknown>
  sourceKey?: string | null
  productType?: 'shared' | 'app' | 'bracket' | 'legacy'
}): Promise<boolean> {
  return createPlatformNotification({
    userId: input.userId,
    leagueId: input.leagueId ?? undefined,
    productType: input.productType ?? 'app',
    type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity,
    meta: input.meta,
    sourceKey: input.sourceKey ?? undefined,
  })
}
