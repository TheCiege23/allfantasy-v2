import { describe, expect, it } from 'vitest'

import { validateConceptRulesShape } from '@/lib/specialty-automation/validation'
import { buildIdempotencyKey } from '@/lib/specialty-automation/types'

describe('validateConceptRulesShape', () => {
  it('accepts null rules', () => {
    expect(validateConceptRulesShape(null)).toEqual({ ok: true })
  })

  it('accepts object extensions', () => {
    expect(validateConceptRulesShape({ extensions: { foo: 1 } })).toEqual({ ok: true })
  })

  it('rejects non-object extensions', () => {
    expect(validateConceptRulesShape({ extensions: 'bad' as unknown as Record<string, unknown> })).toEqual({
      ok: false,
      reason: 'invalid_concept_rules_extensions',
    })
  })
})

describe('buildIdempotencyKey', () => {
  it('includes null week as na', () => {
    expect(
      buildIdempotencyKey({
        leagueId: 'a',
        season: 2026,
        week: null,
        trigger: 'onManualRun',
        conceptKey: 'guillotine',
      }),
    ).toBe('a:2026:na:onManualRun:guillotine')
  })
})
