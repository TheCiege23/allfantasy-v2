import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import {
  buildFantasyInviteLink,
  generateInviteToken,
  getDefaultFantasyInviteExpiry,
} from '@/lib/league-invite'

function getBaseUrl(req?: NextRequest): string {
  if (req?.headers.get('x-forwarded-host')) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${req.headers.get('x-forwarded-host')}`
  }
  return process.env.NEXTAUTH_URL ?? 'https://allfantasy.ai'
}

function normalizeInviteExpiry(raw: unknown): string | null {
  if (raw instanceof Date) return raw.toISOString()
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return null
}

function getInviteExpired(inviteExpiresAt: string | null): boolean {
  if (!inviteExpiresAt) return false
  const parsed = new Date(inviteExpiresAt)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now()
}

async function ensureLeagueInvite(
  leagueId: string,
  settings: Record<string, unknown>,
  baseUrl: string,
  options?: { expiresInDays?: number }
): Promise<{ inviteCode: string; joinUrl: string; inviteLink: string; inviteExpiresAt: string | null; inviteExpired: boolean }> {
  const existingCode = typeof settings.inviteCode === 'string' && settings.inviteCode.trim()
    ? settings.inviteCode.trim()
    : null
  const inviteCode = existingCode ?? generateInviteToken(8)
  const existingExpiry = normalizeInviteExpiry(settings.inviteExpiresAt)
  const inviteExpiresAt = existingExpiry ?? getDefaultFantasyInviteExpiry(options?.expiresInDays)
  const joinUrl = buildFantasyInviteLink(inviteCode, baseUrl)
  const inviteLink = joinUrl

  if (!existingCode || !existingExpiry || settings.inviteLink !== inviteLink) {
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        settings: { ...settings, inviteCode, inviteLink, inviteExpiresAt },
      },
    })
  }

  return {
    inviteCode,
    joinUrl,
    inviteLink,
    inviteExpiresAt,
    inviteExpired: getInviteExpired(inviteExpiresAt),
  }
}

/** GET: return current invite code/link from settings. POST: regenerate and store in settings. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { settings: true, name: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = (league.settings as Record<string, unknown>) || {}
  const invite = await ensureLeagueInvite(params.leagueId, settings, getBaseUrl())
  return NextResponse.json({
    inviteCode: invite.inviteCode,
    inviteLink: invite.inviteLink,
    joinUrl: invite.joinUrl,
    inviteExpiresAt: invite.inviteExpiresAt,
    inviteExpired: invite.inviteExpired,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const regenerate = body?.regenerate !== false
  const expiresInDays =
    typeof body?.expiresInDays === 'number' && Number.isFinite(body.expiresInDays)
      ? Math.max(1, Math.min(90, Math.trunc(body.expiresInDays)))
      : undefined

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = (league.settings as Record<string, unknown>) || {}
  const inviteCode = regenerate
    ? generateInviteToken(8)
    : (typeof settings.inviteCode === 'string' && settings.inviteCode.trim() ? settings.inviteCode.trim() : generateInviteToken(8))
  const inviteExpiresAt = getDefaultFantasyInviteExpiry(expiresInDays)
  const joinUrl = buildFantasyInviteLink(inviteCode, getBaseUrl(req))
  const inviteLink = joinUrl

  const updated = await prisma.league.update({
    where: { id: params.leagueId },
    data: {
      settings: { ...settings, inviteCode, inviteLink, inviteExpiresAt },
    },
    select: { id: true, settings: true },
  })
  const s = (updated.settings as Record<string, unknown>) || {}
  const normalizedExpiresAt = normalizeInviteExpiry(s.inviteExpiresAt)
  return NextResponse.json({
    status: 'ok',
    inviteCode: s.inviteCode,
    inviteLink: s.inviteLink,
    joinUrl,
    inviteExpiresAt: normalizedExpiresAt,
    inviteExpired: getInviteExpired(normalizedExpiresAt),
  })
}
