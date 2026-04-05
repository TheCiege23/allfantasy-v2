import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.hoisted(() => vi.fn())
const analyticsEventCreateMock = vi.hoisted(() => vi.fn())

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/telemetry/usage', () => ({
  withApiUsage: () => (handler: (...args: any[]) => any) => handler,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analyticsEvent: {
      create: analyticsEventCreateMock,
    },
  },
}))

describe('share track route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-145' } })
    analyticsEventCreateMock.mockResolvedValue({ id: 'analytics-1' })
  })

  it('rejects invalid share events', async () => {
    const { POST } = await import('@/app/api/share/track/route')
    const response = await POST(
      createMockNextRequest('http://localhost/api/share/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'invalid_event' }),
      })
    )

    expect(response.status).toBe(400)
    expect(analyticsEventCreateMock).not.toHaveBeenCalled()
  })

  it('stores sanitized analytics metadata for valid share events', async () => {
    const { POST } = await import('@/app/api/share/track/route')
    const response = await POST(
      createMockNextRequest('http://localhost/api/share/track', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Playwright',
        },
        body: JSON.stringify({
          event: 'share_complete',
          sessionId: 'session-1',
          path: '/tools/social-share-engine-harness',
          meta: {
            shareType: 'creator_league_promo',
            destination: 'discord',
            shareId: 'share-145',
            sport: 'SOCCER',
            visibility: 'public',
            usedFallback: true,
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(analyticsEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: 'share_complete',
        sessionId: 'session-1',
        path: '/tools/social-share-engine-harness',
        userId: 'user-145',
        toolKey: 'ShareEngine',
        meta: expect.objectContaining({
          shareType: 'creator_league_promo',
          destination: 'discord',
          shareId: 'share-145',
          sport: 'SOCCER',
          visibility: 'public',
          usedFallback: true,
        }),
      }),
    })
  })
})
