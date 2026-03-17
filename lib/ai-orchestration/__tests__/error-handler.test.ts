/**
 * Error handler tests — error codes, user messages, HTTP status.
 */

import { describe, it, expect } from 'vitest'
import { toAIErrorCode, toUnifiedAIError, toHttpStatus } from '../error-handler'

describe('toAIErrorCode', () => {
  it('maps timeout', () => {
    expect(toAIErrorCode('request timeout')).toBe('timeout')
    expect(toAIErrorCode(new Error('Timed out'))).toBe('timeout')
  })

  it('maps rate limit', () => {
    expect(toAIErrorCode('429 too many')).toBe('rate_limited')
  })

  it('maps unauthorized', () => {
    expect(toAIErrorCode('401 unauthorized')).toBe('unauthorized')
  })

  it('defaults to unknown', () => {
    expect(toAIErrorCode('random error')).toBe('unknown')
  })
})

describe('toUnifiedAIError', () => {
  it('returns userMessage for code', () => {
    const e = toUnifiedAIError('provider_unavailable')
    expect(e.code).toBe('provider_unavailable')
    expect(e.userMessage).toBeDefined()
    expect(e.userMessage.length).toBeGreaterThan(0)
  })

  it('accepts traceId', () => {
    const e = toUnifiedAIError('timeout', { traceId: 't1' })
    expect(e.traceId).toBe('t1')
  })
})

describe('toHttpStatus', () => {
  it('returns 400 for validation', () => {
    expect(toHttpStatus('envelope_validation_failed')).toBe(400)
  })

  it('returns 401 for unauthorized', () => {
    expect(toHttpStatus('unauthorized')).toBe(401)
  })

  it('returns 429 for rate_limited', () => {
    expect(toHttpStatus('rate_limited')).toBe(429)
  })

  it('returns 503 for provider_unavailable and timeout', () => {
    expect(toHttpStatus('provider_unavailable')).toBe(503)
    expect(toHttpStatus('timeout')).toBe(503)
  })
})
