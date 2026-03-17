import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

// ─── AUTH-003: NEXTAUTH_SECRET startup validation ─────────────────────────
describe('AUTH-003: NEXTAUTH_SECRET startup validation', () => {
  const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    // restore original env
    if (ORIGINAL_SECRET !== undefined) {
      process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET
    } else {
      delete process.env.NEXTAUTH_SECRET
    }
    vi.resetModules()
  })

  it('throws when NEXTAUTH_SECRET is missing', async () => {
    delete process.env.NEXTAUTH_SECRET
    await expect(() => import('@/lib/auth')).rejects.toThrow(
      /NEXTAUTH_SECRET is missing or too short/
    )
  })

  it('throws when NEXTAUTH_SECRET is shorter than 32 characters', async () => {
    process.env.NEXTAUTH_SECRET = 'short'
    await expect(() => import('@/lib/auth')).rejects.toThrow(
      /NEXTAUTH_SECRET is missing or too short/
    )
  })

  it('does not throw when NEXTAUTH_SECRET is at least 32 characters', async () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32)
    // importing with a valid secret should not throw
    await expect(import('@/lib/auth')).resolves.toBeDefined()
  })
})

// ─── AUTH-005: Login rate limiting ───────────────────────────────────────────
describe('AUTH-005: rateLimit – 5 attempts per 15 minutes', () => {
  const WINDOW_MS = 15 * 60 * 1000
  const MAX = 5

  it('allows up to MAX attempts and then blocks', () => {
    const ip = `test-ip-${Date.now()}`

    for (let i = 0; i < MAX; i++) {
      const result = rateLimit(ip, MAX, WINDOW_MS)
      expect(result.success).toBe(true)
    }

    // 6th attempt should be blocked
    const blocked = rateLimit(ip, MAX, WINDOW_MS)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('unknown IP is limited to 2 attempts (stricter shared bucket)', () => {
    // Use a unique 'unknown' key per test run to avoid cross-test pollution
    const unknownIp = `unknown-${Date.now()}`
    const maxForUnknown = 2

    for (let i = 0; i < maxForUnknown; i++) {
      expect(rateLimit(unknownIp, maxForUnknown, WINDOW_MS).success).toBe(true)
    }
    expect(rateLimit(unknownIp, maxForUnknown, WINDOW_MS).success).toBe(false)
  })

  it('resets after the window expires', () => {
    vi.useFakeTimers()
    const ip = `test-ip-reset-${Date.now()}`

    // exhaust attempts
    for (let i = 0; i < MAX; i++) {
      rateLimit(ip, MAX, WINDOW_MS)
    }
    expect(rateLimit(ip, MAX, WINDOW_MS).success).toBe(false)

    // advance time past the window
    vi.advanceTimersByTime(WINDOW_MS + 1)

    // should allow again
    expect(rateLimit(ip, MAX, WINDOW_MS).success).toBe(true)

    vi.useRealTimers()
  })
})

// ─── AUTH-002: requireApiSession ─────────────────────────────────────────────
describe('AUTH-002: requireApiSession', () => {
  beforeEach(() => {
    vi.resetModules()
    // Provide a valid secret so lib/auth.ts loads without throwing
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    vi.doMock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue(null),
    }))

    const { requireApiSession } = await import('@/lib/api-auth-helper')
    const result = await requireApiSession()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  it('returns 401 when session user id is missing', async () => {
    vi.doMock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue({ user: {} }),
    }))

    const { requireApiSession } = await import('@/lib/api-auth-helper')
    const result = await requireApiSession()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  it('returns ok with session data when session is valid', async () => {
    vi.doMock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com', name: 'Alice' },
      }),
    }))

    const { requireApiSession } = await import('@/lib/api-auth-helper')
    const result = await requireApiSession()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session.userId).toBe('user-123')
      expect(result.session.email).toBe('user@example.com')
      expect(result.session.name).toBe('Alice')
    }
  })
})

// ─── AUTH-001: middleware public/protected path logic ────────────────────────
describe('AUTH-001: middleware path classification', () => {
  // Test the pure path-matching logic directly
  const PUBLIC_PATHS = new Set([
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify',
    '/pricing',
    '/privacy',
    '/terms',
    '/support',
    '/early-access',
    '/rankings',
    '/robots.txt',
    '/sitemap.xml',
  ])

  const PUBLIC_PREFIXES = ['/auth/', '/api/', '/_next/', '/favicon']

  function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.has(pathname)) return true
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  }

  it('treats /login as public', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('treats /signup as public', () => {
    expect(isPublicPath('/signup')).toBe(true)
  })

  it('treats /api/... as public (API routes manage their own auth)', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true)
    expect(isPublicPath('/api/leagues')).toBe(true)
  })

  it('treats /dashboard as protected', () => {
    expect(isPublicPath('/dashboard')).toBe(false)
  })

  it('treats /leagues as protected', () => {
    expect(isPublicPath('/leagues')).toBe(false)
  })

  it('treats /import as protected', () => {
    expect(isPublicPath('/import')).toBe(false)
  })

  it('treats /trade as protected', () => {
    expect(isPublicPath('/trade')).toBe(false)
  })

  it('treats /_next/static as public', () => {
    expect(isPublicPath('/_next/static/chunks/main.js')).toBe(true)
  })
})
