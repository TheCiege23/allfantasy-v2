import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/ai-gm-analyze/route'

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
  validateRequestOrigin: vi.fn(() => true),
  forbiddenResponse: vi.fn((msg) => new NextResponse(JSON.stringify({ error: msg }), { status: 403 })),
}))

vi.mock('@/lib/sleeper-client', () => ({
  getSleeperUser: vi.fn(async (username) => ({
    user_id: 'user-123',
    username,
    display_name: 'Test User',
  })),
  getLeagueInfo: vi.fn(async () => ({
    league_id: 'league-123',
    name: 'Test League',
    settings: { type: 2 }, // dynasty
    roster_positions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF'],
  })),
  getLeagueRosters: vi.fn(async () => [
    {
      roster_id: 1,
      owner_id: 'user-123',
      players: ['111', '222', '333'],
    },
    {
      roster_id: 2,
      owner_id: 'user-456',
      players: ['444', '555', '666'],
    },
  ]),
  getAllPlayers: vi.fn(async () => ({
    '111': { first_name: 'Justin', last_name: 'Jefferson', position: 'WR' },
    '222': { first_name: 'Austin', last_name: 'Ekeler', position: 'RB' },
    '333': { first_name: 'Travis', last_name: 'Kelce', position: 'TE' },
    '444': { first_name: 'Derrick', last_name: 'Henry', position: 'RB' },
    '555': { first_name: 'CeeDee', last_name: 'Lamb', position: 'WR' },
    '666': { first_name: 'Joe', last_name: 'Burrow', position: 'QB' },
  })),
  getLeagueUsers: vi.fn(async () => [
    { user_id: 'user-123', username: 'user1', display_name: 'Test User' },
    { user_id: 'user-456', username: 'user2', display_name: 'Other User' },
  ]),
}))

vi.mock('@/lib/ai-gm-intelligence', () => ({
  buildComprehensiveTradeContext: vi.fn(async () => ({
    leagueName: 'Test League',
    leagueSettings: {
      isDynasty: true,
      isSuperFlex: true,
      isTeePremium: false,
      scoringType: 'PPR',
      rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF'],
      teamCount: 12,
    },
    marketValues: {
      playersGiven: [{ id: '111', name: 'Justin Jefferson', value: 9000 }],
      playersReceived: [{ id: '444', name: 'Derrick Henry', value: 8500 }],
    },
    userTradingProfile: {
      tradeCount: 5,
      recentTrades: 2,
      preferredAssets: ['WR', 'RB'],
    },
    playerNewsAndSentiment: [],
  })),
  generateAIGMAnalysis: vi.fn(async () => ({
    verdict: 'ACCEPT',
    confidence: 0.82,
    reasoning: 'Good value trade - acquiring elite RB',
    strengths: ['Addresses RB need', 'Fair market value'],
    concerns: ['Losing WR depth'],
  })),
  runPreAnalysisForUser: vi.fn(async () => ({
    ready: true,
    username: 'user1',
    leaguesAnalyzed: 2,
    lastAnalysisAt: new Date().toISOString(),
  })),
}))

vi.mock('@/lib/analytics-server', () => ({
  trackLegacyToolUsage: vi.fn(async () => ({})),
}))

vi.mock('@/lib/telemetry/usage', () => ({
  withApiUsage: vi.fn((config) => {
    return (handler) => handler
  }),
}))

describe('ai-gm-analyze API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/legacy/ai-gm-analyze', () => {
    it('checks readiness for analysis (happy path)', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/legacy/ai-gm-analyze')
      url.searchParams.set('username', 'user1')
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
      expect(response.status).toBe(200)
      expect(data.ready).toBe(true)
      expect(data.username).toBe('user1')
      expect(data.leaguesAnalyzed).toBe(2)
      expect(data.lastAnalysisAt).toBeDefined()
    })

    it('requires username parameter', async () => {
      // Arrange - missing username
      const url = new URL('http://localhost:3000/api/legacy/ai-gm-analyze')

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
      expect(data.error).toContain('Username required')
    })
  })

  describe('POST /api/legacy/ai-gm-analyze', () => {
    it('generates AI GM analysis for trade (happy path)', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'user1',
          leagueId: 'league123',
          sport: 'nfl',
          trade: {
            playersGiving: ['111'], // Justin Jefferson
            playersReceiving: ['444'], // Derrick Henry
            picksGiving: [],
            picksReceiving: [],
            partnerRosterId: 2,
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert - validate response structure
      expect(response.status).toBe(200)
      expect(data.analysis).toBeDefined()
      expect(data.analysis.verdict).toBe('ACCEPT')
      expect(data.analysis.confidence).toBe(0.82)
      expect(data.analysis.reasoning).toBeDefined()
      expect(data.analysis.strengths).toBeDefined()
      expect(Array.isArray(data.analysis.strengths)).toBe(true)
      expect(data.analysis.concerns).toBeDefined()

      // Validate context metadata
      expect(data.context).toBeDefined()
      expect(data.context.leagueName).toBe('Test League')
      expect(data.context.leagueSettings).toBeDefined()
      expect(data.context.leagueSettings.isDynasty).toBe(true)
      expect(data.context.leagueSettings.isSuperFlex).toBe(true)
      expect(data.context.marketValues).toBeDefined()
      expect(data.context.userTradingProfile).toBeDefined()
    })

    it('validates required fields in request', async () => {
      // Arrange - missing leagueId
      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'user1',
          trade: {
            playersGiving: ['111'],
            playersReceiving: ['444'],
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('leagueId')
    })

    it('returns 404 when user not found', async () => {
      // Mock getSleeperUser to return null
      const { getSleeperUser } = await import('@/lib/sleeper-client')
      vi.mocked(getSleeperUser).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'nonexistent',
          leagueId: 'league123',
          trade: {
            playersGiving: ['111'],
            playersReceiving: ['444'],
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toContain('Sleeper user not found')
    })

    it('includes market values in response', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'user1',
          leagueId: 'league123',
          trade: {
            playersGiving: ['111', '222'], // JJ + Ekeler
            playersReceiving: ['444'], // Henry
            picksGiving: ['1.01'],
            picksReceiving: [],
            partnerRosterId: 2,
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert - validate market value data
      expect(response.status).toBe(200)
      expect(data.context.marketValues.playersGiven).toBeDefined()
      expect(Array.isArray(data.context.marketValues.playersGiven)).toBe(true)
      expect(data.context.marketValues.playersGiven.length).toBeGreaterThan(0)
      expect(data.context.marketValues.playersReceived).toBeDefined()
      expect(Array.isArray(data.context.marketValues.playersReceived)).toBe(true)
    })
  })

  describe('Telemetry and response validation', () => {
    it('analysis verdict is one of expected values', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'user1',
          leagueId: 'league123',
          trade: {
            playersGiving: ['111'],
            playersReceiving: ['444'],
            partnerRosterId: 2,
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert
      expect(['ACCEPT', 'REJECT', 'NEUTRAL']).toContain(data.analysis.verdict)
      expect(data.analysis.confidence).toBeGreaterThanOrEqual(0)
      expect(data.analysis.confidence).toBeLessThanOrEqual(1)
    })

    it('includes player information in trade context', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/legacy/ai-gm-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
        body: JSON.stringify({
          username: 'user1',
          leagueId: 'league123',
          trade: {
            playersGiving: ['111'], // Justin Jefferson
            playersReceiving: ['444'], // Derrick Henry
            partnerRosterId: 2,
          },
        }),
      })

      // Act
      const response = await legacyPost(request)
      const data = await response.json()

      // Assert - validate player names were formatted
      expect(response.status).toBe(200)
      expect(data.context.marketValues).toBeDefined()
      expect(data.context.marketValues.playersGiven).toBeDefined()
      const playersGiven = data.context.marketValues.playersGiven
      expect(playersGiven[0].name).toContain('Jefferson')
    })
  })
})
