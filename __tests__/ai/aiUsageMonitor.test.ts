import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiRateLimitRecord: { findMany: vi.fn() },
    sportsDataCache:    { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/ai/envVerification', () => ({
  verifyProviderEnv: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyProviderEnv } from '@/lib/ai/envVerification'
import { getAiUsageReport } from '@/lib/ai/aiUsageMonitor'

const mockCapFindMany   = prisma.apiRateLimitRecord.findMany as ReturnType<typeof vi.fn>
const mockCacheFindMany = prisma.sportsDataCache.findMany    as ReturnType<typeof vi.fn>
const mockVerify        = verifyProviderEnv as ReturnType<typeof vi.fn>

function makeEnv(overrides: Partial<ReturnType<typeof verifyProviderEnv>> = {}) {
  return {
    openaiConfigured:    false,
    anthropicConfigured: false,
    xaiConfigured:       false,
    deepseekConfigured:  false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockVerify.mockReturnValue(makeEnv())
  mockCapFindMany.mockResolvedValue([])
  mockCacheFindMany.mockResolvedValue([])
})

// ── Provider status ───────────────────────────────────────────────────────────

describe('providerStatus', () => {
  it('reflects configured providers as true booleans', async () => {
    mockVerify.mockReturnValue(makeEnv({ openaiConfigured: true, anthropicConfigured: true }))

    const report = await getAiUsageReport()

    expect(report.providerStatus.openai).toBe(true)
    expect(report.providerStatus.anthropic).toBe(true)
    expect(report.providerStatus.xai).toBe(false)
    expect(report.providerStatus.deepseek).toBe(false)
  })

  it('returns all false when nothing configured', async () => {
    const report = await getAiUsageReport()

    for (const val of Object.values(report.providerStatus)) {
      expect(val).toBe(false)
    }
  })

  it('never returns raw keys — all values are booleans', async () => {
    mockVerify.mockReturnValue(makeEnv({ xaiConfigured: true, deepseekConfigured: true }))

    const report = await getAiUsageReport()

    for (const val of Object.values(report.providerStatus)) {
      expect(typeof val).toBe('boolean')
    }
  })

  it('supports GROK_API_KEY alias (delegated to isXaiAvailable via envVerification)', async () => {
    // verifyProviderEnv already handles the alias; monitor just delegates
    mockVerify.mockReturnValue(makeEnv({ xaiConfigured: true }))

    const report = await getAiUsageReport()

    expect(report.providerStatus.xai).toBe(true)
    expect(mockVerify).toHaveBeenCalled()
  })

  it('supports DEEPSEEK_API_KEY (delegated to envVerification)', async () => {
    mockVerify.mockReturnValue(makeEnv({ deepseekConfigured: true }))

    const report = await getAiUsageReport()

    expect(report.providerStatus.deepseek).toBe(true)
  })
})

// ── Daily cap summary ─────────────────────────────────────────────────────────

describe('caps', () => {
  it('returns dataAvailable:true with empty byFeature when no records', async () => {
    mockCapFindMany.mockResolvedValue([])

    const report = await getAiUsageReport()

    expect(report.caps.dataAvailable).toBe(true)
    expect(report.caps.totalCallsToday).toBe(0)
    expect(report.caps.byFeature).toHaveLength(0)
  })

  it('aggregates calls and users by feature from endpoint prefix', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:abc123', callsMade: 5, callsLimit: 10 },
      { endpoint: 'chimmy:def456', callsMade: 8, callsLimit: 10 },
      { endpoint: 'explain_bracket:ghi789', callsMade: 1, callsLimit: 2 },
    ])

    const report = await getAiUsageReport()

    expect(report.caps.totalCallsToday).toBe(14)
    expect(report.caps.totalUsersToday).toBe(3)

    const chimmy = report.caps.byFeature.find((f) => f.feature === 'chimmy')
    expect(chimmy?.totalUsers).toBe(2)
    expect(chimmy?.totalCalls).toBe(13)

    const explain = report.caps.byFeature.find((f) => f.feature === 'explain_bracket')
    expect(explain?.totalUsers).toBe(1)
    expect(explain?.totalCalls).toBe(1)
  })

  it('counts users near cap when callsMade/callsLimit >= 0.8', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:aaa', callsMade: 8, callsLimit: 10 },  // 80% → near
      { endpoint: 'chimmy:bbb', callsMade: 9, callsLimit: 10 },  // 90% → near
      { endpoint: 'chimmy:ccc', callsMade: 3, callsLimit: 10 },  // 30% → not near
    ])

    const report = await getAiUsageReport()

    expect(report.caps.usersNearCap).toBe(2)
    expect(report.caps.usersAtCap).toBe(0)
  })

  it('counts users at cap when callsMade >= callsLimit', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:aaa', callsMade: 10, callsLimit: 10 },
      { endpoint: 'chimmy:bbb', callsMade: 12, callsLimit: 10 },
      { endpoint: 'chimmy:ccc', callsMade: 5,  callsLimit: 10 },
    ])

    const report = await getAiUsageReport()

    expect(report.caps.usersAtCap).toBe(2)
  })

  it('returns dataAvailable:false and fails open when DB throws', async () => {
    mockCapFindMany.mockRejectedValue(new Error('DB offline'))

    const report = await getAiUsageReport()

    expect(report.caps.dataAvailable).toBe(false)
    expect(report.caps.totalCallsToday).toBe(0)
  })

  it('never exposes raw user IDs — endpoints contain only hashed values', async () => {
    const rawId = 'raw-user-id-12345'
    mockCapFindMany.mockResolvedValue([
      { endpoint: `chimmy:${rawId}`, callsMade: 1, callsLimit: 10 },
    ])

    const report = await getAiUsageReport()

    // The raw user ID should not appear anywhere in the report
    const json = JSON.stringify(report)
    expect(json).not.toContain(rawId)
  })

  it('includes a windowDate string in YYYY-MM-DD format', async () => {
    const report = await getAiUsageReport()

    expect(report.caps.windowDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ── Cache stats ───────────────────────────────────────────────────────────────

describe('cache', () => {
  it('returns dataAvailable:true with 0 entries when no cache rows', async () => {
    mockCacheFindMany.mockResolvedValue([])

    const report = await getAiUsageReport()

    expect(report.cache.dataAvailable).toBe(true)
    expect(report.cache.activeCacheEntries).toBe(0)
  })

  it('parses feature from aic:feature:... cache key format', async () => {
    mockCacheFindMany.mockResolvedValue([
      { cacheKey: 'aic:chimmy:scope1:q1:c1' },
      { cacheKey: 'aic:chimmy:scope2:q2:c2' },
      { cacheKey: 'aic:explain_bracket:scope3:q3:c3' },
    ])

    const report = await getAiUsageReport()

    expect(report.cache.activeCacheEntries).toBe(3)

    const chimmy = report.cache.byFeature.find((f) => f.feature === 'chimmy')
    expect(chimmy?.count).toBe(2)

    const explain = report.cache.byFeature.find((f) => f.feature === 'explain_bracket')
    expect(explain?.count).toBe(1)
  })

  it('returns dataAvailable:false and fails open when DB throws', async () => {
    mockCacheFindMany.mockRejectedValue(new Error('DB offline'))

    const report = await getAiUsageReport()

    expect(report.cache.dataAvailable).toBe(false)
    expect(report.cache.activeCacheEntries).toBe(0)
  })

  it('never includes raw cache key values containing user IDs or emails', async () => {
    const userEmail = 'user@example.com'
    mockCacheFindMany.mockResolvedValue([
      // If somehow a bad key exists, it should not appear in feature grouping output
      { cacheKey: `aic:chimmy:${userEmail}:q:c` },
    ])

    const report = await getAiUsageReport()

    // The email should not appear in feature-level output
    const byFeatureJson = JSON.stringify(report.cache.byFeature)
    expect(byFeatureJson).not.toContain(userEmail)
  })
})

// ── Telemetry ─────────────────────────────────────────────────────────────────

describe('telemetry', () => {
  it('returns tracked:false when ChimmyContextRun table is unavailable', async () => {
    // The monitor falls back to tracked:false when prisma.chimmyContextRun is missing
    const report = await getAiUsageReport()

    // With no chimmyContextRun on the mock prisma, it fails safely
    expect(report.telemetry.tracked).toBe(false)
    expect(report.telemetry.totalRuns).toBe(0)
  })
})

// ── Cost estimate ─────────────────────────────────────────────────────────────

describe('costEstimate', () => {
  it('returns precise:false always', async () => {
    const report = await getAiUsageReport()

    expect(report.costEstimate.precise).toBe(false)
  })

  it('includes a note explaining the estimate basis', async () => {
    const report = await getAiUsageReport()

    expect(typeof report.costEstimate.note).toBe('string')
    expect(report.costEstimate.note.length).toBeGreaterThan(10)
  })

  it('calculates zero cost when no calls made', async () => {
    const report = await getAiUsageReport()

    expect(report.costEstimate.totalLowUsd).toBe(0)
    expect(report.costEstimate.totalHighUsd).toBe(0)
  })

  it('produces a positive cost range when calls exist', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:abc', callsMade: 10, callsLimit: 10 },
      { endpoint: 'explain_bracket:def', callsMade: 3, callsLimit: 5 },
    ])

    const report = await getAiUsageReport()

    expect(report.costEstimate.totalLowUsd).toBeGreaterThan(0)
    expect(report.costEstimate.totalHighUsd).toBeGreaterThan(report.costEstimate.totalLowUsd)
  })

  it('maps chimmy to cheap profile and explain_bracket to standard', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:abc', callsMade: 1, callsLimit: 10 },
      { endpoint: 'explain_bracket:def', callsMade: 1, callsLimit: 5 },
    ])

    const report = await getAiUsageReport()

    const chimmyRow = report.costEstimate.byFeature.find((r) => r.feature === 'chimmy')
    const explainRow = report.costEstimate.byFeature.find((r) => r.feature === 'explain_bracket')

    expect(chimmyRow?.profile).toBe('cheap')
    expect(explainRow?.profile).toBe('standard')

    // explain_bracket calls cost more per call than chimmy
    expect(explainRow!.estimatedLowUsd).toBeGreaterThan(chimmyRow!.estimatedLowUsd)
  })

  it('does not claim exact dollar amounts — low < high range', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'commissioner_brain:abc', callsMade: 5, callsLimit: 5 },
    ])

    const report = await getAiUsageReport()

    const cbRow = report.costEstimate.byFeature.find((r) => r.feature === 'commissioner_brain')
    expect(cbRow?.profile).toBe('premium')
    expect(cbRow?.estimatedHighUsd).toBeGreaterThan(cbRow?.estimatedLowUsd ?? 0)
  })
})

// ── Privacy ───────────────────────────────────────────────────────────────────

describe('privacy safeguards', () => {
  it('report contains no email-like strings', async () => {
    mockCapFindMany.mockResolvedValue([
      { endpoint: 'chimmy:abc123def456ghi78900', callsMade: 5, callsLimit: 10 },
    ])

    const report = await getAiUsageReport()
    const json = JSON.stringify(report)

    expect(json).not.toMatch(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  })

  it('report contains no raw API key patterns', async () => {
    const report = await getAiUsageReport()
    const json = JSON.stringify(report)

    // OpenAI key pattern
    expect(json).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
    // Anthropic key pattern
    expect(json).not.toMatch(/sk-ant-[A-Za-z0-9]{20,}/)
  })

  it('generatedAt is a Date object', async () => {
    const report = await getAiUsageReport()

    expect(report.generatedAt).toBeInstanceOf(Date)
  })
})
