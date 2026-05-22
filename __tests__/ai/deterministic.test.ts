import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSchedule: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  detectScheduleQuestion,
  checkScheduleContextAvailable,
  tryDeterministicAnswer,
  DETERMINISTIC_SOURCE,
} from '@/lib/ai/deterministic'

const mockCount = prisma.gameSchedule.count as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

// ── detectScheduleQuestion ────────────────────────────────────────────────────

describe('detectScheduleQuestion', () => {
  const shouldMatch = [
    'What sports games are being played today?',
    'what games are on today',
    'Are any games on tonight?',
    'games today',
    'What games are on tonight?',
    "tonight's games",
    "today's schedule",
    "today's matchups",
    'What sports are on today?',
    'What sports are happening tonight?',
    'NBA games today',
    'NFL games tonight',
    'Are there MLB games today?',
    "what's on tonight",
    "what is on today",
    'any games on now?',
    'games being played today',
    'NHL games tonight',
    'soccer games today',
    'ncaa games today',
  ]

  const shouldNotMatch = [
    'What is my rank?',
    'Explain my bracket.',
    'Who should I start this week?',
    'How many points do I need to win?',
    'Who is the best quarterback?',
    'Trade advice?',
    'Tell me about my roster.',
    'What are the standings?',
  ]

  for (const msg of shouldMatch) {
    it(`matches: "${msg}"`, () => {
      expect(detectScheduleQuestion(msg)).toBe(true)
    })
  }

  for (const msg of shouldNotMatch) {
    it(`does not match: "${msg}"`, () => {
      expect(detectScheduleQuestion(msg)).toBe(false)
    })
  }
})

// ── checkScheduleContextAvailable ────────────────────────────────────────────

describe('checkScheduleContextAvailable', () => {
  it('returns true when DB has games today', async () => {
    mockCount.mockResolvedValue(5)

    const result = await checkScheduleContextAvailable()

    expect(result).toBe(true)
  })

  it('returns false when DB has no games today', async () => {
    mockCount.mockResolvedValue(0)

    const result = await checkScheduleContextAvailable()

    expect(result).toBe(false)
  })

  it('returns false on DB error (fail-safe)', async () => {
    mockCount.mockRejectedValue(new Error('DB offline'))

    const result = await checkScheduleContextAvailable()

    expect(result).toBe(false)
  })

  it('queries with a UTC daily window', async () => {
    mockCount.mockResolvedValue(0)

    await checkScheduleContextAvailable()

    expect(mockCount).toHaveBeenCalledOnce()
    const where = mockCount.mock.calls[0][0].where
    const { gte, lt } = where.startTime
    // Window spans exactly 24 hours
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1_000)
    // dayStart is midnight UTC
    expect(gte.getUTCHours()).toBe(0)
    expect(gte.getUTCMinutes()).toBe(0)
    expect(gte.getUTCSeconds()).toBe(0)
  })
})

// ── tryDeterministicAnswer ────────────────────────────────────────────────────

describe('tryDeterministicAnswer', () => {
  it('returns refusal string for schedule question with no DB context', async () => {
    mockCount.mockResolvedValue(0)

    const result = await tryDeterministicAnswer('What games are on today?')

    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(10)
    expect(result).toContain("live schedule data")
  })

  it('returns null for schedule question when DB has games (pipeline should handle it)', async () => {
    mockCount.mockResolvedValue(3)

    const result = await tryDeterministicAnswer('What games are on today?')

    expect(result).toBeNull()
  })

  it('returns null for non-schedule questions without querying DB', async () => {
    const result = await tryDeterministicAnswer('What is my rank?')

    expect(result).toBeNull()
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('returns null for "Explain my bracket" without querying DB', async () => {
    const result = await tryDeterministicAnswer('Explain my bracket.')

    expect(result).toBeNull()
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('returns null for "Who should I start?" without querying DB', async () => {
    const result = await tryDeterministicAnswer('Who should I start this week?')

    expect(result).toBeNull()
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('returns refusal (not null) when DB errors on schedule question (fail-safe)', async () => {
    // checkScheduleContextAvailable returns false on DB error,
    // so a schedule question with a DB error returns the refusal.
    mockCount.mockRejectedValue(new Error('DB offline'))

    const result = await tryDeterministicAnswer('Any games on tonight?')

    expect(typeof result).toBe('string')
  })
})

// ── DETERMINISTIC_SOURCE marker ───────────────────────────────────────────────

describe('DETERMINISTIC_SOURCE', () => {
  it('is a non-empty string literal', () => {
    expect(typeof DETERMINISTIC_SOURCE).toBe('string')
    expect(DETERMINISTIC_SOURCE.length).toBeGreaterThan(0)
  })
})
