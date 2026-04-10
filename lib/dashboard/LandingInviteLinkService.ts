import { prisma } from '@/lib/prisma'
import { createInviteLink } from '@/lib/invite-engine'
import { normalizeToken } from '@/lib/invite-engine/tokenGenerator'

function baseUrlFromRequest(req: Request): string {
  const env = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
  if (env) {
    const u = env.startsWith('http') ? env : `https://${env}`
    return u.replace(/\/$/, '')
  }
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`.replace(/\/$/, '')
  return 'https://allfantasy.ai'
}

/**
 * One stable landing-home invite per user (`InviteLink` type `referral`, metadata.landingHome).
 */
export async function getOrCreateLandingHomeInvite(
  userId: string,
  req: Request
): Promise<{ ok: true; token: string; landingUrl: string } | { ok: false; error: string }> {
  const base = baseUrlFromRequest(req)

  const existingRows = await prisma.inviteLink.findMany({
    where: {
      createdByUserId: userId,
      type: 'referral',
      status: 'active',
    },
    select: { token: true, metadata: true },
    take: 20,
  })
  const existing = existingRows.find(
    (r) => r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata) && (r.metadata as { landingHome?: boolean }).landingHome === true
  )

  if (existing?.token) {
    const token = existing.token
    return {
      ok: true,
      token,
      landingUrl: `${base}/?invite=${encodeURIComponent(token)}`,
    }
  }

  const created = await createInviteLink(userId, 'referral', {
    metadata: { landingHome: true, label: 'Home landing invite' },
    baseUrl: base,
  })

  if (!created.ok) {
    return { ok: false, error: created.error }
  }

  return {
    ok: true,
    token: created.inviteLink.token,
    landingUrl: `${base}/?invite=${encodeURIComponent(created.inviteLink.token)}`,
  }
}

export async function findLandingHomeInviteLinkByToken(token: string) {
  const normalized = normalizeToken(token)
  if (!normalized) return null
  const row = await prisma.inviteLink.findFirst({
    where: {
      token: normalized,
      type: 'referral',
      status: 'active',
    },
    select: {
      id: true,
      token: true,
      createdByUserId: true,
      useCount: true,
      maxUses: true,
      metadata: true,
    },
  })
  if (!row) return null
  const meta = row.metadata as { landingHome?: boolean } | null
  if (!meta?.landingHome) return null
  return row
}
