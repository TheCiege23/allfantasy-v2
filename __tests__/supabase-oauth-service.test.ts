import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithOAuthMock = vi.hoisted(() => vi.fn())
const createClientMock = vi.hoisted(() =>
  vi.fn(() => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  }))
)

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('Supabase OAuth service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns not-configured when Supabase env keys are missing', async () => {
    const { isSupabaseGoogleOAuthReady, signInWithSupabaseGoogle } = await import(
      '@/lib/auth/SupabaseOAuthService'
    )

    expect(isSupabaseGoogleOAuthReady()).toBe(false)
    await expect(
      signInWithSupabaseGoogle({
        callbackUrl: '/dashboard',
      })
    ).resolves.toEqual({
      ok: false,
      error: 'SUPABASE_NOT_CONFIGURED',
    })
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('calls Supabase Google OAuth with safe redirect and returns success', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    vi.stubGlobal('window', {
      location: { origin: 'https://allfantasy.ai' },
    })
    signInWithOAuthMock.mockResolvedValueOnce({ error: null })

    const { isSupabaseGoogleOAuthReady, signInWithSupabaseGoogle } = await import(
      '@/lib/auth/SupabaseOAuthService'
    )

    expect(isSupabaseGoogleOAuthReady()).toBe(true)
    await expect(
      signInWithSupabaseGoogle({
        callbackUrl: '/brackets',
      })
    ).resolves.toEqual({ ok: true })

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key'
    )
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://allfantasy.ai/brackets',
      },
    })
  })

  it('normalizes unsafe callback paths and returns OAuth errors', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    vi.stubGlobal('window', {
      location: { origin: 'https://allfantasy.ai' },
    })
    signInWithOAuthMock.mockResolvedValueOnce({
      error: { message: 'provider_not_enabled' },
    })

    const { signInWithSupabaseGoogle } = await import(
      '@/lib/auth/SupabaseOAuthService'
    )

    await expect(
      signInWithSupabaseGoogle({
        callbackUrl: 'https://bad.site/redirect',
      })
    ).resolves.toEqual({
      ok: false,
      error: 'provider_not_enabled',
    })

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://allfantasy.ai/dashboard',
      },
    })
  })
})
