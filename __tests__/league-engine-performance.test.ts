import { describe, expect, it } from 'vitest'
import { buildWaiverCronIdempotencyKey } from '@/lib/league-engine-performance/idempotencyKeys'

describe('league-engine-performance idempotencyKeys', () => {
  it('buildWaiverCronIdempotencyKey is stable per league per minute', () => {
    const at = new Date('2026-04-20T12:34:56.789Z')
    expect(buildWaiverCronIdempotencyKey('L1', at)).toBe('cron:waiver:L1:2026-04-20T12:34')
  })
})
