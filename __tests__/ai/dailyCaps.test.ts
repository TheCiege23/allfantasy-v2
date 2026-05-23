import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiRateLimitRecord: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  checkDailyCap,
  incrementDailyCap,
  DAILY_CAP_LIMITS,
  type CapFeature,
  type CapTier,
} from '@/lib/ai/dailyCaps'

const mockFindFirst = prisma.apiRateLimitRecord.findFirst as ReturnType<typeof vi.fn>
const mockUpsert = prisma.apiRateLimitRecord.upsert as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

// ── DAILY_CAP_LIMITS shape ────────────────────────────────────────────────────

describe('DAILY_CAP_LIMITS', () => {
  it('free chimmy limit is lower than pro', () => {
    expect(DAILY_CAP_LIMITS.chimmy.free).toBeLessThan(DAILY_CAP_LIMITS.chimmy.pro)
  })

  it('pro chimmy limit is lower than admin', () => {
    expect(DAILY_CAP_LIMITS.chimmy.pro).toBeLessThan(DAILY_CAP_LIMITS.chimmy.admin)
  })

  it('commissioner_brain is 0 for free users', () => {
    expect(DAILY_CAP_LIMITS.commissioner_brain.free).toBe(0)
  })

  it('all limits are non-negative integers', () => {
    for (const feature of Object.values(DAILY_CAP_LIMITS)) {
      expect(feature.free).toBeGreaterThanOrEqual(0)
      expect(feature.pro).toBeGreaterThanOrEqual(0)
      expect(feature.admin).toBeGreaterThanOrEqual(0)
    }
  })

  it('has admin tier for all three features', () => {
    expect(typeof DAILY_CAP_LIMITS.chimmy.admin).toBe('number')
    expect(typeof DAILY_CAP_LIMITS.explain_bracket.admin).toBe('number')
    expect(typeof DAILY_CAP_LIMITS.commissioner_brain.admin).toBe('number')
  })
})

// ── checkDailyCap ─────────────────────────────────────────────────────────────

describe('checkDailyCap', () => {
  it('allows free user who has used 0 of 10', async () => {
    mockFindFirst.mockResolvedValue(null) // no record yet

    const result = await checkDailyCap('chimmy', 'user-abc', 'free')

    expect(result.allowed).toBe(true)
    expect(result.used).toBe(0)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.chimmy.free)
  })

  it('denies free user who is at the limit', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.free })

    const result = await checkDailyCap('chimmy', 'user-abc', 'free')

    expect(result.allowed).toBe(false)
    expect(result.used).toBe(DAILY_CAP_LIMITS.chimmy.free)
  })

  it('allows pro user who would be at the free limit but not the pro limit', async () => {
    // Free limit is 10, pro limit is 30
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.free })

    const result = await checkDailyCap('chimmy', 'user-pro', 'pro')

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.chimmy.pro)
  })

  it('denies pro user who is at the pro limit', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.pro })

    const result = await checkDailyCap('chimmy', 'user-pro', 'pro')

    expect(result.allowed).toBe(false)
  })

  it('denies free user for commissioner_brain (limit=0) without querying DB', async () => {
    const result = await checkDailyCap('commissioner_brain', 'user-free', 'free')

    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(0)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('allows pro user for commissioner_brain', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: 2 })

    const result = await checkDailyCap('commissioner_brain', 'user-pro', 'pro')

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.commissioner_brain.pro)
  })

  it('fails open when DB throws', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB offline'))

    const result = await checkDailyCap('chimmy', 'user-abc', 'free')

    expect(result.allowed).toBe(true)
  })

  it('includes a friendly cap-exceeded message', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.free })

    const result = await checkDailyCap('chimmy', 'user-abc', 'free')

    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(10)
  })

  it('includes a resetsAt date in the future', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await checkDailyCap('chimmy', 'user-abc', 'free')

    expect(result.resetsAt).toBeInstanceOf(Date)
    expect(result.resetsAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('does not expose raw userId in the DB endpoint', async () => {
    const rawUserId = 'raw-user-id-12345'
    mockFindFirst.mockResolvedValue(null)

    await checkDailyCap('chimmy', rawUserId, 'free')

    const callArgs = mockFindFirst.mock.calls[0][0]
    const endpoint: string = callArgs.where.endpoint
    expect(endpoint).not.toContain(rawUserId)
    // endpoint should be feature + ":" + sha256 hash prefix
    expect(endpoint).toMatch(/^chimmy:[0-9a-f]{20}$/)
  })

  it('two different users produce different DB endpoints', async () => {
    const endpoints: string[] = []

    for (const userId of ['user-alpha', 'user-beta']) {
      mockFindFirst.mockResolvedValue(null)
      await checkDailyCap('chimmy', userId, 'free')
      const callArgs = mockFindFirst.mock.calls.at(-1)![0]
      endpoints.push(callArgs.where.endpoint)
    }

    expect(endpoints[0]).not.toBe(endpoints[1])
  })

  it('allows admin user who is at pro limit but not admin limit', async () => {
    // Admin limit > pro limit — a user at the pro count is still allowed as admin
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.pro })

    const result = await checkDailyCap('chimmy', 'user-admin', 'admin')

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.chimmy.admin)
  })

  it('denies admin user at the admin limit', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: DAILY_CAP_LIMITS.chimmy.admin })

    const result = await checkDailyCap('chimmy', 'user-admin', 'admin')

    expect(result.allowed).toBe(false)
  })

  it('allows admin user for commissioner_brain', async () => {
    mockFindFirst.mockResolvedValue({ callsMade: 3 })

    const result = await checkDailyCap('commissioner_brain', 'user-admin', 'admin')

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(DAILY_CAP_LIMITS.commissioner_brain.admin)
  })
})

// ── incrementDailyCap ─────────────────────────────────────────────────────────

describe('incrementDailyCap', () => {
  it('calls upsert with increment:1', async () => {
    mockUpsert.mockResolvedValue({})

    await incrementDailyCap('chimmy', 'user-abc', 'free')

    expect(mockUpsert).toHaveBeenCalledOnce()
    const call = mockUpsert.mock.calls[0][0]
    expect(call.update.callsMade).toEqual({ increment: 1 })
  })

  it('sets callsLimit to the tier limit on create', async () => {
    mockUpsert.mockResolvedValue({})

    await incrementDailyCap('chimmy', 'user-abc', 'free')

    const call = mockUpsert.mock.calls[0][0]
    expect(call.create.callsLimit).toBe(DAILY_CAP_LIMITS.chimmy.free)
  })

  it('never throws when DB errors', async () => {
    mockUpsert.mockRejectedValue(new Error('DB gone'))

    await expect(incrementDailyCap('chimmy', 'user-abc', 'free')).resolves.toBeUndefined()
  })

  it('uses daily UTC window boundaries', async () => {
    mockUpsert.mockResolvedValue({})

    await incrementDailyCap('chimmy', 'user-abc', 'free')

    const call = mockUpsert.mock.calls[0][0]
    const { windowStart, windowEnd } = call.create
    // Window spans exactly 24 hours
    expect(windowEnd.getTime() - windowStart.getTime()).toBe(24 * 60 * 60 * 1000)
    // windowStart is midnight UTC
    expect(windowStart.getUTCHours()).toBe(0)
    expect(windowStart.getUTCMinutes()).toBe(0)
    expect(windowStart.getUTCSeconds()).toBe(0)
  })
})
