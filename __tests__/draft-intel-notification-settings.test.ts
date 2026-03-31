import { describe, expect, it, vi } from 'vitest'
import { resolveNotificationPreferences } from '@/lib/notification-settings/NotificationPreferenceResolver'

vi.mock('server-only', () => ({}))

describe('draft intel notification settings', () => {
  it('includes draft_intel_alerts in resolved preferences by default', () => {
    const prefs = resolveNotificationPreferences(null)
    expect(prefs.categories?.draft_intel_alerts?.enabled).toBe(true)
    expect(prefs.categories?.draft_intel_alerts?.inApp).toBe(true)
  })

  it('treats draft_intel_alerts as push eligible', async () => {
    const { PUSH_NOTIFICATION_CATEGORIES } = await import('@/lib/push-notifications')
    expect(PUSH_NOTIFICATION_CATEGORIES).toContain('draft_intel_alerts')
  })
})
