/**
 * Request validator tests — envelope validation, sport normalization.
 */

import { describe, it, expect } from 'vitest'
import { validateAIRequest, validateEnvelope } from '../request-validator'

describe('validateAIRequest', () => {
  it('rejects missing body', () => {
    const r = validateAIRequest(null)
    expect(r.valid).toBe(false)
    expect(r.errorCode).toBe('envelope_validation_failed')
  })

  it('rejects missing envelope', () => {
    const r = validateAIRequest({})
    expect(r.valid).toBe(false)
  })

  it('rejects empty featureType', () => {
    const r = validateAIRequest({ envelope: { sport: 'NFL' } })
    expect(r.valid).toBe(false)
  })

  it('accepts valid envelope and normalizes sport', () => {
    const r = validateAIRequest({
      envelope: { featureType: 'trade_analyzer', sport: 'nfl' },
    })
    expect(r.valid).toBe(true)
    expect(r.envelope?.sport).toBe('NFL')
    expect(r.envelope?.featureType).toBe('trade_analyzer')
  })

  it('rejects invalid mode', () => {
    const r = validateAIRequest({
      envelope: { featureType: 'trade_analyzer', sport: 'NFL' },
      mode: 'invalid_mode',
    })
    expect(r.valid).toBe(false)
  })
})

describe('validateEnvelope', () => {
  it('normalizes unknown sport to default', () => {
    const r = validateEnvelope({ featureType: 'waiver_ai' })
    expect(r.valid).toBe(true)
    expect(r.envelope?.sport).toBeDefined()
  })
})
