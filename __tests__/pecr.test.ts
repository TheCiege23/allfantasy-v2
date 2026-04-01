import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pecrLogCreateMock } = vi.hoisted(() => ({
  pecrLogCreateMock: vi.fn().mockResolvedValue({ id: 'pecr-log-1' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pecrLog: {
      create: pecrLogCreateMock,
    },
  },
}))

import { runPECR } from '@/lib/ai/pecr'

describe('runPECR', () => {
  beforeEach(() => {
    pecrLogCreateMock.mockClear()
  })

  it('completes in 1 iteration when check passes', async () => {
    const result = await runPECR('input', {
      feature: 'chimmy',
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'output',
      check: () => ({ passed: true, failures: [] }),
    })

    expect(result.iterations).toBe(1)
    expect(result.passed).toBe(true)
  })

  it('retries up to maxIterations when check fails', async () => {
    const result = await runPECR('input', {
      feature: 'trade',
      maxIterations: 3,
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'output',
      check: () => ({ passed: false, failures: ['missing data'], refineHint: 'add data' }),
    })

    expect(result.iterations).toBe(3)
    expect(result.passed).toBe(false)
  })

  it('accumulates refineHints across iterations', async () => {
    let captured: string[] = []

    await runPECR('input', {
      feature: 'waiver',
      maxIterations: 3,
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async (plan) => {
        captured = [...plan.refineHints]
        return 'out'
      },
      check: () => ({ passed: false, failures: [], refineHint: 'hint-A' }),
    })

    expect(captured.length).toBeGreaterThan(0)
    expect(captured).toContain('hint-A')
  })

  it('durationMs is a positive number', async () => {
    const result = await runPECR('x', {
      feature: 'simulation',
      plan: async () => ({ intent: 'x', steps: [], context: {}, refineHints: [] }),
      execute: async () => 42,
      check: () => ({ passed: true, failures: [] }),
    })

    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('allFailures has one array per failed iteration', async () => {
    const result = await runPECR('x', {
      feature: 'trade',
      maxIterations: 2,
      plan: async () => ({ intent: 'x', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'out',
      check: () => ({ passed: false, failures: ['f1', 'f2'] }),
    })

    expect(result.allFailures).toHaveLength(2)
    expect(result.allFailures[0]).toEqual(['f1', 'f2'])
  })

  it('logs each PECR run through Prisma', async () => {
    await runPECR('input', {
      feature: 'chimmy',
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'output',
      check: () => ({ passed: true, failures: [] }),
    })

    expect(pecrLogCreateMock).toHaveBeenCalledTimes(1)
  })
})
