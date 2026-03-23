import { describe, expect, it } from 'vitest'

import { validateSignInInput } from '@/lib/auth/SignInFormController'
import {
  resolveLoginErrorMessage,
  resolvePasswordResetErrorMessage,
} from '@/lib/auth/AuthErrorMessageResolver'
import { buildProviderPendingHref } from '@/lib/auth/ProviderPendingFlow'
import {
  getProviderDisplayName,
  getProviderFallbackMessage,
} from '@/lib/auth/ProviderFallbackFlowService'

describe('Sign-in and recovery controllers', () => {
  it('validates unified login identifier and password requirements', () => {
    expect(validateSignInInput({ login: '', password: 'x' })).toEqual({
      ok: false,
      error: 'Enter your email, username, or mobile number.',
    })
    expect(validateSignInInput({ login: 'user', password: '' })).toEqual({
      ok: false,
      error: 'Enter your password.',
    })
    expect(validateSignInInput({ login: 'user', password: 'secret' })).toEqual({
      ok: true,
    })
  })

  it('maps auth and reset errors to user-friendly copy', () => {
    expect(resolveLoginErrorMessage('PASSWORD_NOT_SET')).toContain('password')
    expect(resolveLoginErrorMessage('SLEEPER_ONLY_ACCOUNT')).toContain('Sleeper')
    expect(resolvePasswordResetErrorMessage('EXPIRED_TOKEN')).toContain('expired')
    expect(resolvePasswordResetErrorMessage('UNKNOWN_ERROR')).toBe('UNKNOWN_ERROR')
  })

  it('builds provider-pending route with safe callback', () => {
    expect(
      buildProviderPendingHref({
        provider: 'google',
        callbackUrl: '/brackets',
      })
    ).toContain('provider=google')
    expect(
      buildProviderPendingHref({
        provider: 'x',
        callbackUrl: 'https://bad.site',
      })
    ).toContain(encodeURIComponent('/dashboard'))
  })

  it('returns provider fallback metadata', () => {
    expect(getProviderDisplayName('tiktok')).toBe('TikTok')
    expect(getProviderFallbackMessage('apple')).toContain('configured')
  })
})
