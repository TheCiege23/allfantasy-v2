import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dispatchNotification: vi.fn(async () => {}),
  createPlatformNotification: vi.fn(async () => ({})),
  engagementCreate: vi.fn(async () => ({})),
  routeAlertDelivery: vi.fn(() => ({
    shouldDeliver: true,
    surfaces: ['in_app_banner'],
    transportChannels: ['push_notification', 'email', 'sms'],
    primarySurface: 'in_app_banner',
    futureChannels: [],
    reason: 'test',
  })),
}))

vi.mock('@/lib/notifications/NotificationDispatcher', () => ({
  dispatchNotification: mocks.dispatchNotification,
}))

vi.mock('@/lib/platform/notification-service', () => ({
  createPlatformNotification: mocks.createPlatformNotification,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    engagementEvent: {
      create: mocks.engagementCreate,
    },
  },
}))

vi.mock('@/lib/chimmy-alerts/ChimmyAlertDeliveryRouter', async () => {
  const actual = await vi.importActual('@/lib/chimmy-alerts/ChimmyAlertDeliveryRouter')
  return {
    ...actual,
    routeAlertDelivery: mocks.routeAlertDelivery,
  }
})

import { deliverAlert } from '@/lib/chimmy-alerts/ChimmyAlertEngine'

describe('deliverAlert channel filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes skipChannels to dispatcher from filtered alert channels', async () => {
    const alert = {
      alertId: 'alert-1',
      dedupeKey: 'dedupe-1',
      class: 'lineup',
      type: 'lineup_incomplete',
      title: 'Set lineup',
      message: 'Missing slot',
      severity: 'urgent',
      confidenceScore: 90,
      urgencyScore: 85,
      channels: ['in_app_banner', 'email'],
      primaryChannel: 'in_app_banner',
      dismissible: true,
      snoozable: true,
      repeatable: true,
      repeatCooldownMinutes: 90,
      roleScope: 'member',
      actions: [{ label: 'Open', href: '/dashboard' }],
    }

    const context = {
      userId: 'user-1',
      role: 'member',
      sport: 'NFL',
      leagueType: 'redraft',
    }

    await deliverAlert(alert as any, context as any)

    expect(mocks.dispatchNotification).toHaveBeenCalledTimes(1)
    const params = mocks.dispatchNotification.mock.calls[0][0]
    expect(params.skipChannels).toEqual({
      email: false,
      sms: true,
      push: true,
    })
  })
})
