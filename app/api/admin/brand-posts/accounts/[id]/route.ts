import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import {
  brandCredentialsCryptoConfigured,
  encryptBrandCredentialFields,
} from '@/lib/brand-social/credentialsCrypto'

export const dynamic = 'force-dynamic'

const MAX_DISPLAY_NAME = 128
const MAX_NOTES = 500

/**
 * PATCH /api/admin/brand-posts/accounts/[id]
 * Body: { displayName?, notes?, isActive?, credentials? }
 *
 * Credentials are a full replacement — send the complete set you want stored.
 * If you pass `credentials: null` the existing value is cleared.
 */
export const PATCH = withApiUsage({
  endpoint: '/api/admin/brand-posts/accounts/[id]',
  tool: 'AdminBrandAccountUpdate',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.displayName === 'string' || body.displayName === null) {
    update.displayName =
      typeof body.displayName === 'string'
        ? body.displayName.trim().slice(0, MAX_DISPLAY_NAME) || null
        : null
  }
  if (typeof body.notes === 'string' || body.notes === null) {
    update.notes =
      typeof body.notes === 'string' ? body.notes.trim().slice(0, MAX_NOTES) || null : null
  }
  if (typeof body.isActive === 'boolean') {
    update.isActive = body.isActive
  }

  if ('credentials' in body) {
    if (body.credentials === null) {
      update.credentialsJson = null
    } else if (body.credentials && typeof body.credentials === 'object') {
      const credsInput = body.credentials as Record<string, unknown>
      const hasNonEmpty = Object.values(credsInput).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      )
      if (hasNonEmpty && !brandCredentialsCryptoConfigured()) {
        return NextResponse.json(
          {
            error:
              'Credentials cannot be stored without BRAND_SOCIAL_ENCRYPTION_KEY configured on the server.',
          },
          { status: 503 },
        )
      }
      update.credentialsJson = encryptBrandCredentialFields(credsInput)
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const existing = await (prisma as any).brandSocialAccount.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const updated = await (prisma as any).brandSocialAccount.update({
    where: { id },
    data: update,
    select: {
      id: true,
      platform: true,
      handle: true,
      displayName: true,
      isActive: true,
      notes: true,
      updatedAt: true,
    },
  })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_account_updated',
        path: '/api/admin/brand-posts/accounts/[id]',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          accountId: id,
          fields: Object.keys(update),
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, account: updated })
})

/** DELETE /api/admin/brand-posts/accounts/[id] — cascades to posts (schema CASCADE). */
export const DELETE = withApiUsage({
  endpoint: '/api/admin/brand-posts/accounts/[id]',
  tool: 'AdminBrandAccountDelete',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await (prisma as any).brandSocialAccount.findUnique({
    where: { id },
    select: { id: true, platform: true, handle: true },
  })
  if (!existing) return NextResponse.json({ ok: true, deleted: false })

  await (prisma as any).brandSocialAccount.delete({ where: { id } })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_account_deleted',
        path: '/api/admin/brand-posts/accounts/[id]',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          accountId: id,
          platform: existing.platform,
          handle: existing.handle,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, deleted: true })
})
