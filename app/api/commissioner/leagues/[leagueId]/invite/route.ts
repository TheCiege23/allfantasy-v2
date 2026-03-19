import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { buildLeagueInviteUrl } from '@/lib/viral-loop'
import crypto from 'crypto'

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
}

async function ensureLeagueInvite(
  leagueId: string,
  settings: Record<string, unknown>
): Promise<{ inviteCode: string; joinUrl: string; inviteLink: string }> {
  const existingCode = typeof settings.inviteCode === 'string' && settings.inviteCode.trim()
    ? settings.inviteCode.trim()
    : null
  const inviteCode = existingCode ?? generateInviteCode()
  const joinUrl = buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'league_invite' } })
  const inviteLink = joinUrl

  if (!existingCode || settings.inviteLink !== inviteLink) {
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        settings: { ...settings, inviteCode, inviteLink },
      },
    })
  }

  return { inviteCode, joinUrl, inviteLink }
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
  const invite = await ensureLeagueInvite(params.leagueId, settings)
  return NextResponse.json({
    inviteCode: invite.inviteCode,
    inviteLink: invite.inviteLink,
    joinUrl: invite.joinUrl,
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

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = (league.settings as Record<string, unknown>) || {}
  const inviteCode = regenerate
    ? generateInviteCode()
    : (typeof settings.inviteCode === 'string' && settings.inviteCode.trim() ? settings.inviteCode.trim() : generateInviteCode())
  const joinUrl = buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'league_invite' } })
  const inviteLink = joinUrl

  const updated = await prisma.league.update({
    where: { id: params.leagueId },
    data: {
      settings: { ...settings, inviteCode, inviteLink },
    },
    select: { id: true, settings: true },
  })
  const s = (updated.settings as Record<string, unknown>) || {}
  return NextResponse.json({
    status: 'ok',
    inviteCode: s.inviteCode,
    inviteLink: s.inviteLink,
    joinUrl,
  })
}
