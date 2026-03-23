import { describe, expect, it } from 'vitest'

import { resolveLoginCallbackUrl } from '@/lib/auth/LoginFlowController'
import {
  resolvePostSignupCallbackUrl,
  resolveSignupRedirectPath,
} from '@/lib/auth/SignupFlowController'
import {
  isValidPhoneE164,
  normalizePhoneE164,
} from '@/lib/auth/ForgotPasswordFlowController'
import { getProviderFallbackMessage } from '@/lib/auth/ProviderFallbackFlowService'
import { resolveAuthSessionDestination } from '@/lib/auth/AuthSessionRouter'

describe('Unified auth flow controllers', () => {
  it('resolves safe login destination from callback or next', () => {
    expect(
      resolveLoginCallbackUrl({
        callbackUrl: '/brackets',
        next: '/dashboard',
      })
    ).toBe('/brackets')

    expect(
      resolveLoginCallbackUrl({
        callbackUrl: 'https://bad.site',
        next: '/app/home',
      })
    ).toBe('/app/home')
  })

  it('resolves signup destination from next or callback fallback', () => {
    expect(
      resolveSignupRedirectPath({
        next: '/app/home',
      })
    ).toBe('/app/home')

    expect(
      resolveSignupRedirectPath({
        callbackUrl: '/brackets',
      })
    ).toBe('/brackets')
  })

  it('routes post-signup to phone verify when method is phone', () => {
    expect(
      resolvePostSignupCallbackUrl({
        redirectAfterSignup: '/brackets',
        verificationMethod: 'PHONE',
      })
    ).toContain('/verify?method=phone')

    expect(
      resolvePostSignupCallbackUrl({
        redirectAfterSignup: '/app/home',
        verificationMethod: 'EMAIL',
      })
    ).toBe('/app/home')
  })

  it('normalizes and validates phone values for SMS reset', () => {
    expect(normalizePhoneE164('(555) 123-4567')).toBe('+15551234567')
    expect(normalizePhoneE164('+14155551234')).toBe('+14155551234')
    expect(isValidPhoneE164('+15551234567')).toBe(true)
    expect(isValidPhoneE164('5551234567')).toBe(false)
  })

  it('returns provider fallback copy for pending providers', () => {
    expect(getProviderFallbackMessage('facebook')).toContain('planned')
    expect(getProviderFallbackMessage('google')).toContain('not configured')
  })

  it('resolves auth session fallback destination', () => {
    expect(
      resolveAuthSessionDestination({
        callbackUrl: '/app/home',
      })
    ).toBe('/app/home')
    expect(
      resolveAuthSessionDestination({
        callbackUrl: 'https://evil.site',
        next: null,
        fallback: '/dashboard',
      })
    ).toBe('/dashboard')
  })
})
