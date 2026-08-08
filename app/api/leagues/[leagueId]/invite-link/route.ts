import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFantasyInviteLink } from '@/lib/league-invite/LeagueInviteService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/{leagueId}/invite-link — the shareable "claim your team"
 * growth link for a league. Any member (owner or claimed team) can fetch it;
 * the link lands on /join?code=… which previews the league, attributes the
 * signup to league_invite, and claims a placeholder roster on join.
 *
 * Imported leagues often have no invite code yet (settings.inviteCode is only
 * minted by the create flow) — this route mints one on first request, using
 * the SAME settings.inviteCode contract the join validation already scans.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L lookalikes

function mintInviteCode(length = 10): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { leagueId } = await params

  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: { id: true, name: true, settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const baseUrl = req.nextUrl.origin

  let result = await getFantasyInviteLink(leagueId, baseUrl)
  if (!result.ok && result.error === 'NO_INVITE_CODE') {
    const settings = (league.settings as Record<string, unknown> | null) ?? {}
    const code = mintInviteCode()
    await prisma.league.update({
      where: { id: leagueId },
      data: { settings: { ...settings, inviteCode: code } },
    })
    result = await getFantasyInviteLink(leagueId, baseUrl)
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    leagueName: league.name,
    inviteCode: result.inviteCode,
    inviteLink: result.inviteLink,
    inviteExpiresAt: result.inviteExpiresAt,
  })
}
