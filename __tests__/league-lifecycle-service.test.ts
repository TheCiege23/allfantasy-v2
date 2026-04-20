import { describe, expect, it } from 'vitest'

import { validateTransition, normalizeLifecycleState } from '@/server/services/leagueLifecycleService'

describe('leagueLifecycleService', () => {
  it('validateTransition rejects duplicate state', () => {
    const r = validateTransition('in_season', 'in_season')
    expect(r.ok).toBe(false)
  })

  it('validateTransition allows in_season -> playoffs', () => {
    const r = validateTransition('in_season', 'playoffs')
    expect(r.ok).toBe(true)
  })

  it('normalizeLifecycleState falls back for unknown', () => {
    expect(normalizeLifecycleState('not_a_state')).toBe('in_season')
  })
})
