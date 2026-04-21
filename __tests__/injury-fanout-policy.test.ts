import { describe, it, expect } from 'vitest'
import {
  injuryFanoutSortPriority,
  shouldIncludeInjuryInFanoutBatch,
} from '@/lib/realtime-events/injuryFanoutPolicy'

describe('injuryFanoutPolicy', () => {
  it('excludes probable/active from fanout batch', () => {
    expect(shouldIncludeInjuryInFanoutBatch('Active')).toBe(false)
    expect(shouldIncludeInjuryInFanoutBatch('Probable')).toBe(false)
  })

  it('includes meaningful statuses', () => {
    expect(shouldIncludeInjuryInFanoutBatch('Out')).toBe(true)
    expect(shouldIncludeInjuryInFanoutBatch('Doubtful')).toBe(true)
    expect(shouldIncludeInjuryInFanoutBatch('Questionable')).toBe(true)
  })

  it('orders severity for prioritization', () => {
    expect(injuryFanoutSortPriority('Out')).toBeLessThan(injuryFanoutSortPriority('Questionable'))
    expect(injuryFanoutSortPriority('Doubtful')).toBeLessThan(injuryFanoutSortPriority('Questionable'))
  })
})
