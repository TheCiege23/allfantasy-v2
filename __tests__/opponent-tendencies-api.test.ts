import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/opponent-tendencies/route'

// Mock dependencies
vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: vi.fn(() => ({
    success: true,
    remaining: 4,
    retryAfterSec: 0,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/api-auth', () => ({
  requireAuthOrOrigin: vi.fn(() => ({
    authenticated: true,
  })),
  forbiddenResponse: vi.fn((msg) => new NextResponse(JSON.stringify({ error: msg }), { status: 403 })),
}))

vi.mock('@/lib/opponent-tendencies', () => ({
  getOrComputeOpponentTendencies: vi.fn(async () => [
    {
      rosterId: 1,
      username: 'user1',
      displayName: 'User One',
      tendencies: {
        rookieBias: 0.3,
        riskAversion: 0.6,
        pickPreference: 0.75,
        starChasing: 0.4,
        positionNeeds: { QB: 0.1, RB: 0.8, WR: 0.5, TE: 0.2, K: 0 },
        tradeWillingness: 0.7,
        buyLowHunter: 0.5,
        loyaltyFactor: 0.4,
        consolidationPreference: 0.6,
        veteranLean: 0.3,
      },
      tradeLikelihood: {
        overall: 0.65,
        assetMatch: 0.7,
        willingness: 0.7,
        needsAlignment: 0.6,
        reasons: ['Strong RB need', 'Willing to trade'],
      },
      pitchAngles: [
        {
          angle: 'Value discount angle',
          effectiveness: 0.8,
          description: 'Frame trade as getting RB at discount',
        },
      ],
      confidence: 0.85,
      tradeCount: 12,
      seasonsCovered: 3,
    },
  ]),
  getCachedOpponentProfile: vi.fn(async (leagueId, rosterId) => {
    if (rosterId === 1) {
      return {
        rosterId: 1,
        username: 'user1',
        displayName: 'User One',
        tendencies: {
          rookieBias: 0.3,
          riskAversion: 0.6,
          pickPreference: 0.75,
          starChasing: 0.4,
          positionNeeds: { QB: 0.1, RB: 0.8, WR: 0.5, TE: 0.2, K: 0 },
          tradeWillingness: 0.7,
          buyLowHunter: 0.5,
          loyaltyFactor: 0.4,
          consolidationPreference: 0.6,
          veteranLean: 0.3,
        },
        tradeLikelihood: {
          overall: 0.65,
          assetMatch: 0.7,
          willingness: 0.7,
          needsAlignment: 0.6,
          reasons: ['Strong RB need', 'Willing to trade'],
        },
        pitchAngles: [
          {
            angle: 'Value discount angle',
            effectiveness: 0.8,
            description: 'Frame trade as getting RB at discount',
          },
        ],
        confidence: 0.85,
        tradeCount: 12,
        seasonsCovered: 3,
      }
    }
    return null
  }),
}))

vi.mock('@/lib/telemetry/usage', () => ({
  withApiUsage: vi.fn((config) => {
    return (handler) => handler
  }),
}))

describe('opponent-tendencies API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/legacy/opponent-tendencies', () => {
    it('computes opponent tendencies for league (happy path)', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/opponent-tendencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          leagueId: 'league123',
          userRosterId: 5,
          forceRefresh: false,
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.leagueId).toBe('league123')
      expect(data.profiles).toBeDefined()
      expect(Array.isArray(data.profiles)).toBe(true)
      expect(data.count).toBe(1)
      expect(data.rateLimit).toBeDefined()
      expect(data.rateLimit.remaining).toBe(4)

      // Validate response structure matches lib types
      const profile = data.profiles[0]
      expect(profile.rosterId).toBe(1)
      expect(profile.username).toBe('user1')
      expect(profile.displayName).toBe('User One')
      expect(profile.tendencies).toBeDefined()
      expect(profile.tendencies.rookieBias).toBe(0.3)
      expect(profile.tendencies.tradeWillingness).toBe(0.7)
      expect(profile.tradeLikelihood).toBeDefined()
      expect(profile.tradeLikelihood.overall).toBe(0.65)
      expect(Array.isArray(profile.pitchAngles)).toBe(true)
      expect(profile.confidence).toBe(0.85)
      expect(profile.tradeCount).toBe(12)
      expect(profile.seasonsCovered).toBe(3)
    })

    it('validates required fields in request', async () => {
      // Arrange - missing userRosterId
      const request = new NextRequest('http://localhost:3000/api/legacy/opponent-tendencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          leagueId: 'league123',
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.error).toContain('Invalid request')
    })
  })

  describe('GET /api/legacy/opponent-tendencies', () => {
    it('retrieves cached opponent profile (happy path)', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/legacy/opponent-tendencies')
      url.searchParams.set('leagueId', 'league123')
      url.searchParams.set('rosterId', '1')

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-key',
        },
      })

      // Act
      const response = await legacyGet(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.profile).toBeDefined()
      expect(data.profile.rosterId).toBe(1)
      expect(data.profile.username).toBe('user1')
      expect(data.profile.displayName).toBe('User One')
      expect(data.profile.tendencies).toBeDefined()
      expect(data.profile.tradeLikelihood).toBeDefined()
      expect(data.profile.pitchAngles).toBeDefined()
      expect(data.profile.confidence).toBe(0.85)
      expect(data.rateLimit).toBeDefined()
    })

    it('returns 404 when profile not found', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/legacy/opponent-tendencies')
      url.searchParams.set('leagueId', 'league123')
      url.searchParams.set('rosterId', '999')

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-key',
        },
      })

      // Act
      const response = await legacyGet(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.ok).toBe(false)
      expect(data.error).toContain('No opponent profile found')
    })

    it('validates required query parameters', async () => {
      // Arrange - missing rosterId
      const url = new URL('http://localhost:3000/api/legacy/opponent-tendencies')
      url.searchParams.set('leagueId', 'league123')

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-key',
        },
      })

      // Act
      const response = await legacyGet(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing leagueId and rosterId parameters')
    })
  })

  describe('Telemetry and response validation', () => {
    it('response includes expected metadata fields', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/opponent-tendencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          leagueId: 'league123',
          userRosterId: 5,
          forceRefresh: false,
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert - validate dual telemetry would be in response
      expect(data.rateLimit).toBeDefined()
      expect(data.rateLimit.remaining).toBeGreaterThanOrEqual(0)
      expect(data.rateLimit.retryAfterSec).toBeGreaterThanOrEqual(0)
      expect(data.count).toBe(data.profiles.length)
    })
  })
})
