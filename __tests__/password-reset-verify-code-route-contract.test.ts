import { beforeEach, describe, expect, it, vi } from 'vitest'

const userProfileFindUniqueMock = vi.fn()
const appUserFindUniqueMock = vi.fn()
const passwordResetTokenFindFirstMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: userProfileFindUniqueMock,
    },
    appUser: {
      findUnique: appUserFindUniqueMock,
    },
    passwordResetToken: {
      findFirst: passwordResetTokenFindFirstMock,
    },
  },
}))

describe('Password reset verify-code route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires identifier and code', async () => {
    const { POST } = await import('@/app/api/auth/password/reset/verify-code/route')
    const res = await POST(
      new Request('http://localhost/api/auth/password/reset/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'MISSING_FIELDS' })
  })

  it('validates email reset code', async () => {
    const { POST } = await import('@/app/api/auth/password/reset/verify-code/route')
    appUserFindUniqueMock.mockResolvedValueOnce({ id: 'u-1' })
    passwordResetTokenFindFirstMock.mockResolvedValueOnce({
      userId: 'u-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })

    const res = await POST(
      new Request('http://localhost/api/auth/password/reset/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', code: '123456' }),
      }) as any
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it('returns invalid token for missing phone mapping', async () => {
    const { POST } = await import('@/app/api/auth/password/reset/verify-code/route')
    userProfileFindUniqueMock.mockResolvedValueOnce(null)

    const res = await POST(
      new Request('http://localhost/api/auth/password/reset/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+15551234567', code: '123456' }),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'INVALID_OR_USED_TOKEN' })
  })
})
