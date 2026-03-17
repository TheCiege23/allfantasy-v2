/**
 * Viral Invite Engine (PROMPT 142) — create, preview, accept, list, analytics.
 */

import { prisma } from '@/lib/prisma'
import { generateInviteToken, normalizeToken } from './tokenGenerator'
import type { InviteType, InvitePreviewDto, InviteEventType } from './types'

const MAX_ACTIVE_PER_USER_PER_DAY = 100
const TOKEN_MAX_ATTEMPTS = 5

function baseUrlFallback(): string {
  return process.env.NEXTAUTH_URL ?? 'https://allfantasy.ai'
}

export function buildInviteUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? baseUrlFallback()).replace(/\/$/, '')
  return `${base}/invite/accept?code=${encodeURIComponent(token)}`
}

export async function createInviteLink(
  createdByUserId: string,
  type: InviteType,
  options: {
    targetId?: string | null
    expiresAt?: Date | null
    maxUses?: number
    metadata?: Record<string, unknown>
    baseUrl?: string
  } = {}
): Promise<{ ok: true; inviteLink: { id: string; token: string; inviteUrl: string }; link: import('@prisma/client').InviteLink } | { ok: false; error: string }> {
  const { targetId = null, expiresAt = null, maxUses = 0, metadata = null, baseUrl } = options

  const since = new Date()
  since.setDate(since.getDate() - 1)
  const recentCount = await prisma.inviteLink.count({
    where: {
      createdByUserId,
      type,
      createdAt: { gte: since },
    },
  })
  if (recentCount >= MAX_ACTIVE_PER_USER_PER_DAY) {
    return { ok: false, error: 'Rate limit: too many invites created' }
  }

  let token = ''
  for (let attempt = 0; attempt < TOKEN_MAX_ATTEMPTS; attempt++) {
    token = normalizeToken(generateInviteToken(10))
    const existing = await prisma.inviteLink.findUnique({ where: { token }, select: { id: true } })
    if (!existing) break
  }
  if (!token) token = normalizeToken(generateInviteToken(10) + Date.now().toString(36).slice(-4))

  const link = await prisma.inviteLink.create({
    data: {
      type,
      token,
      createdByUserId,
      targetId,
      expiresAt,
      maxUses: maxUses ?? 0,
      status: 'active',
      metadata: (metadata ?? {}) as object,
    },
  })

  const inviteUrl = buildInviteUrl(link.token, baseUrl ?? baseUrlFallback())
  return {
    ok: true,
    inviteLink: { id: link.id, token: link.token, inviteUrl },
    link,
  }
}

export async function getInviteByToken(token: string) {
  const t = normalizeToken(token)
  if (!t) return null
  const link = await prisma.inviteLink.findUnique({
    where: { token: t },
    include: { createdBy: { select: { displayName: true, username: true } } },
  })
  if (!link) return null
  const now = new Date()
  if (link.status !== 'active') return link
  if (link.expiresAt && link.expiresAt < now) {
    await prisma.inviteLink.update({
      where: { id: link.id },
      data: { status: 'expired' },
    })
    return { ...link, status: 'expired' as const }
  }
  if (link.maxUses > 0 && link.useCount >= link.maxUses) {
    await prisma.inviteLink.update({
      where: { id: link.id },
      data: { status: 'max_used' },
    })
    return { ...link, status: 'max_used' as const }
  }
  return link
}

/** Public-safe preview: resolve by InviteLink token first, then legacy (bracket joinCode, creator invite code). */
export async function getInvitePreview(
  code: string | null | undefined,
  options?: { userId?: string | null }
): Promise<InvitePreviewDto> {
  const token = normalizeToken(code)
  if (!token) {
    return {
      inviteType: 'league',
      token: '',
      title: 'Invalid invite',
      description: null,
      targetId: null,
      targetName: null,
      sport: null,
      memberCount: null,
      maxMembers: null,
      isFull: false,
      expired: true,
      status: 'invalid',
    }
  }

  const link = await getInviteByToken(token)
  if (link) {
    const now = new Date()
    const expired = link.status === 'expired' || !!(link.expiresAt && link.expiresAt < now)
    const maxed = link.status === 'max_used' || (link.maxUses > 0 && link.useCount >= link.maxUses)
    let title = 'Invite'
    let targetName: string | null = null
    let sport: string | null = null
    let memberCount: number | null = null
    let maxMembers: number | null = null
    let isFull = false

    if (link.type === 'bracket' && link.targetId) {
      const bl = await prisma.bracketLeague.findUnique({
        where: { id: link.targetId },
        select: { name: true, maxManagers: true, _count: { select: { members: true } }, tournament: { select: { name: true, season: true } } },
      })
      if (bl) {
        title = bl.name
        targetName = bl.tournament?.name ?? bl.name
        maxMembers = Number(bl.maxManagers) || 100
        memberCount = bl._count?.members ?? 0
        isFull = memberCount >= maxMembers
      }
    }
    if (link.type === 'creator_league' && link.targetId) {
      const cl = await prisma.creatorLeague.findUnique({
        where: { id: link.targetId },
        select: { name: true, sport: true, memberCount: true, maxMembers: true },
      })
      if (cl) {
        title = cl.name
        targetName = cl.name
        sport = cl.sport
        memberCount = cl.memberCount
        maxMembers = cl.maxMembers
        isFull = maxMembers > 0 && memberCount >= maxMembers
      }
    }
    if (link.type === 'referral' || link.type === 'reactivation' || link.type === 'waitlist') {
      title = link.type === 'referral' ? 'Referral invite' : link.type === 'reactivation' ? 'Reactivation invite' : 'Waitlist'
    }

    let status: InvitePreviewDto['status'] = 'valid'
    if (expired) status = 'expired'
    else if (maxed) status = 'valid'
    else if (isFull && (link.type === 'bracket' || link.type === 'creator_league')) status = 'full'

    return {
      inviteType: link.type as InvitePreviewDto['inviteType'],
      token: link.token,
      title,
      description: null,
      targetId: link.targetId,
      targetName,
      sport,
      memberCount,
      maxMembers,
      isFull,
      expired,
      status,
    }
  }

  const { validateInviteCode } = await import('@/lib/league-invite')
  const validation = await validateInviteCode(token, { userId: options?.userId ?? undefined })
  if (validation.valid || validation.preview) {
    const p = validation.preview!
    return {
      inviteType: 'bracket',
      token,
      title: p.name,
      description: p.tournamentName,
      targetId: p.leagueId,
      targetName: p.tournamentName,
      sport: null,
      memberCount: p.memberCount,
      maxMembers: p.maxManagers,
      isFull: p.isFull,
      expired: p.expired,
      status: validation.valid ? 'valid' : (validation as { error?: string }).error === 'EXPIRED' ? 'expired' : (validation as { error?: string }).error === 'LEAGUE_FULL' ? 'full' : (validation as { error?: string }).error === 'ALREADY_MEMBER' ? 'already_member' : 'invalid',
    }
  }

  const creatorInvite = await prisma.creatorInvite.findUnique({
    where: { code: token },
    include: { league: true },
  })
  if (creatorInvite?.league) {
    const l = creatorInvite.league
    const expired = !!(creatorInvite.expiresAt && creatorInvite.expiresAt < new Date())
    const full = l.maxMembers > 0 && l.memberCount >= l.maxMembers
    return {
      inviteType: 'creator_league',
      token,
      title: l.name,
      description: l.description,
      targetId: l.id,
      targetName: l.name,
      sport: l.sport,
      memberCount: l.memberCount,
      maxMembers: l.maxMembers,
      isFull: full,
      expired,
      status: expired ? 'expired' : full ? 'full' : 'valid',
    }
  }

  return {
    inviteType: 'league',
    token,
    title: 'Invalid invite',
    description: null,
    targetId: null,
    targetName: null,
    sport: null,
    memberCount: null,
    maxMembers: null,
    isFull: false,
    expired: true,
    status: 'invalid',
  }
}

export async function acceptInvite(
  code: string,
  userId: string
): Promise<{ ok: true; targetId?: string; inviteType: string; alreadyMember?: boolean } | { ok: false; error: string }> {
  const token = normalizeToken(code)
  if (!token) return { ok: false, error: 'Invalid code' }

  const link = await getInviteByToken(token)
  if (link) {
    if (link.status !== 'active') {
      if (link.status === 'expired') return { ok: false, error: 'Invite expired' }
      if (link.status === 'max_used') return { ok: false, error: 'Invite limit reached' }
      return { ok: false, error: 'Invite no longer valid' }
    }
    if (link.expiresAt && link.expiresAt < new Date()) return { ok: false, error: 'Invite expired' }
    if (link.maxUses > 0 && link.useCount >= link.maxUses) return { ok: false, error: 'Invite limit reached' }

    if (link.type === 'bracket' && link.targetId) {
      const existing = await prisma.bracketLeagueMember.findUnique({
        where: { leagueId_userId: { leagueId: link.targetId, userId } },
      })
      if (existing) {
        await recordInviteEvent(link.id, 'accepted', undefined, { alreadyMember: true })
        return { ok: true, targetId: link.targetId, inviteType: 'bracket', alreadyMember: true }
      }
      await prisma.bracketLeagueMember.create({
        data: { leagueId: link.targetId, userId, role: 'MEMBER' },
      })
      await prisma.inviteLink.update({
        where: { id: link.id },
        data: { useCount: { increment: 1 } },
      })
      await recordInviteEvent(link.id, 'accepted')
      return { ok: true, targetId: link.targetId, inviteType: 'bracket' }
    }

    if (link.type === 'creator_league' && link.targetId) {
      const { joinByInviteCode } = await import('@/lib/creator-system')
      const result = await joinByInviteCode(token, userId)
      if (!result.success) return { ok: false, error: result.error ?? 'Join failed' }
      await prisma.inviteLink.update({
        where: { id: link.id },
        data: { useCount: { increment: 1 } },
      }).catch(() => {})
      await recordInviteEvent(link.id, 'accepted')
      return { ok: true, targetId: result.creatorLeagueId ?? undefined, inviteType: 'creator_league', alreadyMember: result.alreadyMember }
    }

    if (link.type === 'referral') {
      const { attributeSignup } = await import('@/lib/referral')
      await attributeSignup(userId, token)
      await prisma.inviteLink.update({
        where: { id: link.id },
        data: { useCount: { increment: 1 } },
      })
      await recordInviteEvent(link.id, 'accepted')
      return { ok: true, inviteType: 'referral' }
    }

    await prisma.inviteLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 } },
    })
    await recordInviteEvent(link.id, 'accepted')
    return { ok: true, inviteType: link.type }
  }

  const { validateInviteCode } = await import('@/lib/league-invite')
  const validation = await validateInviteCode(token, { userId })
  if (validation.valid) {
    await prisma.bracketLeagueMember.upsert({
      where: { leagueId_userId: { leagueId: validation.preview.leagueId, userId } },
      update: {},
      create: { leagueId: validation.preview.leagueId, userId, role: 'MEMBER' },
    })
    return { ok: true, targetId: validation.preview.leagueId, inviteType: 'bracket' }
  }

  const { joinByInviteCode } = await import('@/lib/creator-system')
  const creatorResult = await joinByInviteCode(token, userId)
  if (creatorResult.success) {
    return {
      ok: true,
      targetId: creatorResult.creatorLeagueId ?? undefined,
      inviteType: 'creator_league',
      alreadyMember: creatorResult.alreadyMember,
    }
  }

  return { ok: false, error: creatorResult.error ?? 'Invalid or expired invite' }
}

export async function recordInviteEvent(
  inviteLinkId: string,
  eventType: InviteEventType | string,
  channel?: string | null,
  metadata?: Record<string, unknown>
) {
  await prisma.inviteLinkEvent.create({
    data: {
      inviteLinkId,
      eventType: String(eventType),
      channel: channel ?? undefined,
      metadata: (metadata ?? {}) as object,
    },
  })
}

export async function listMyInviteLinks(userId: string, type?: InviteType) {
  const where: { createdByUserId: string; type?: InviteType } = { createdByUserId: userId }
  if (type) where.type = type
  const links = await prisma.inviteLink.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const baseUrl = baseUrlFallback()
  return links.map((l) => ({
    ...l,
    inviteUrl: buildInviteUrl(l.token, baseUrl),
    expiresAt: l.expiresAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }))
}

export async function getInviteStats(userId: string) {
  const [totalCreated, totalAccepted, byType, recentEvents] = await Promise.all([
    prisma.inviteLink.count({ where: { createdByUserId: userId } }),
    prisma.inviteLinkEvent.count({
      where: { eventType: 'accepted', inviteLink: { createdByUserId: userId } },
    }),
    prisma.inviteLink.groupBy({
      by: ['type'],
      where: { createdByUserId: userId },
      _count: { id: true },
    }),
    prisma.inviteLinkEvent.findMany({
      where: { inviteLink: { createdByUserId: userId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { eventType: true, channel: true, createdAt: true, inviteLink: { select: { type: true, token: true } } },
    }),
  ])
  return {
    totalCreated,
    totalAccepted,
    byType: Object.fromEntries(byType.map((x) => [x.type, x._count.id])),
    recentEvents: recentEvents.map((e) => ({
      eventType: e.eventType,
      channel: e.channel,
      type: e.inviteLink.type,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

export async function revokeInviteLink(inviteLinkId: string, userId: string): Promise<boolean> {
  const link = await prisma.inviteLink.findFirst({
    where: { id: inviteLinkId, createdByUserId: userId },
  })
  if (!link) return false
  await prisma.inviteLink.update({
    where: { id: inviteLinkId },
    data: { status: 'revoked' },
  })
  return true
}
