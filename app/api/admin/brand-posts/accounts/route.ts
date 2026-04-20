import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { BRAND_PLATFORMS, type BrandPlatform } from '@/lib/brand-social/types'
import {
  brandCredentialsCryptoConfigured,
  encryptBrandCredentialFields,
} from '@/lib/brand-social/credentialsCrypto'

export const dynamic = 'force-dynamic'

const MAX_HANDLE = 128
const MAX_DISPLAY_NAME = 128
const MAX_NOTES = 500

/** GET /api/admin/brand-posts/accounts — list connected brand accounts. Does NOT include credentials. */
export const GET = withApiUsage({
  endpoint: '/api/admin/brand-posts/accounts',
  tool: 'AdminBrandAccountsList',
})(async (_req: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const accounts = await (prisma as any).brandSocialAccount
    .findMany({
      orderBy: [{ platform: 'asc' }, { handle: 'asc' }],
      select: {
        id: true,
        platform: true,
        handle: true,
        displayName: true,
        isActive: true,
        connectedByEmail: true,
        notes: true,
        createdAt: true,
      },
    })
    .catch((err: unknown) => {
      console.error('[admin/brand-posts/accounts] findMany failed', err)
      return [] as any[]
    })

  return NextResponse.json({ ok: true, count: accounts.length, accounts })
})

/**
 * POST /api/admin/brand-posts/accounts
 * Body: { platform, handle, displayName?, credentials, notes? }
 * `credentials` is a free-shape object — every string value gets encrypted at rest
 * if BRAND_SOCIAL_ENCRYPTION_KEY is set. Platform-specific expectations:
 *   - x:        { accessToken }  (OAuth 2.0 user-context bearer)  OR
 *               { consumerKey, consumerSecret, accessToken, accessTokenSecret }  (OAuth 1.0a)
 *   - others:   TBD — stored as-is for now; publisher decides what to do with them.
 */
export const POST = withApiUsage({
  endpoint: '/api/admin/brand-posts/accounts',
  tool: 'AdminBrandAccountCreate',
})(async (req: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const platform =
    typeof body.platform === 'string' ? (body.platform.trim().toLowerCase() as BrandPlatform) : ('' as BrandPlatform)
  const handle = typeof body.handle === 'string' ? body.handle.trim().slice(0, MAX_HANDLE) : ''
  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim().slice(0, MAX_DISPLAY_NAME) : null
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, MAX_NOTES) : null
  const credsInput = body.credentials && typeof body.credentials === 'object' ? (body.credentials as Record<string, unknown>) : null

  if (!(BRAND_PLATFORMS as readonly string[]).includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform', allowed: [...BRAND_PLATFORMS] },
      { status: 400 },
    )
  }
  if (!handle) return NextResponse.json({ error: 'handle required' }, { status: 400 })

  const hasNonEmptyCreds =
    credsInput != null &&
    Object.values(credsInput).some((v) => typeof v === 'string' && v.trim().length > 0)

  // Refuse to store plaintext credentials — force admins to set the encryption key.
  if (hasNonEmptyCreds && !brandCredentialsCryptoConfigured()) {
    return NextResponse.json(
      {
        error:
          'Credentials cannot be stored without BRAND_SOCIAL_ENCRYPTION_KEY configured on the server. Set the env var and redeploy, then try again.',
      },
      { status: 503 },
    )
  }

  const existing = await (prisma as any).brandSocialAccount.findUnique({
    where: { platform_handle: { platform, handle } },
    select: { id: true },
  }).catch(() => null)
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this platform + handle already exists' },
      { status: 409 },
    )
  }

  const credentialsJson = credsInput ? encryptBrandCredentialFields(credsInput) : null

  const created = await (prisma as any).brandSocialAccount.create({
    data: {
      platform,
      handle,
      displayName,
      credentialsJson,
      notes,
      connectedByAdminId: gate.user.id,
      connectedByEmail: gate.user.email ?? 'unknown',
    },
    select: { id: true, platform: true, handle: true, displayName: true, isActive: true, createdAt: true },
  })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_account_connected',
        path: '/api/admin/brand-posts/accounts',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          platform,
          handle,
          credentialFieldCount: credentialsJson ? Object.keys(credentialsJson).length : 0,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, account: created })
})
