import { describe, expect, it } from 'vitest'

import { cfbdProvider } from '@/lib/workers/providers/cfbd'

describe('cfbdProvider supports sport normalization', () => {
  it('accepts lowercase, uppercase, and alias NCAAF values', () => {
    expect(cfbdProvider.supports({ sport: 'ncaaf', dataType: 'schedule' })).toBe(true)
    expect(cfbdProvider.supports({ sport: 'NCAAF', dataType: 'schedule' })).toBe(true)
    expect(cfbdProvider.supports({ sport: 'CFB', dataType: 'teams' })).toBe(true)
  })

  it('does not claim non-NCAAF sports or unsupported data types', () => {
    expect(cfbdProvider.supports({ sport: 'NFL', dataType: 'schedule' })).toBe(false)
    expect(cfbdProvider.supports({ sport: 'NCAAF', dataType: 'injuries' })).toBe(false)
  })
})
