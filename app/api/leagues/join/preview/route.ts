/**
 * GET /api/leagues/join/preview?code=XXX
 * Preview league by invite code. Returns name, sport, requiresPassword.
 * Does not return leagueId until join is attempted (or we can return it for form submit).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFantasyInviteCode } from '@/lib/league-invite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const result = await validateFantasyInviteCode(code)
  if (result.valid) {
    return NextResponse.json({
      leagueId: result.preview.leagueId,
      name: result.preview.name,
      sport: result.preview.sport,
      requiresPassword: result.preview.requiresPassword,
      inviteExpired: result.preview.expired,
      inviteCode: result.preview.inviteCode,
    })
  }

  const statusByError: Record<string, number> = {
    INVALID_CODE: 404,
    EXPIRED: 410,
    LEAGUE_FULL: 409,
    ALREADY_MEMBER: 409,
    INVITE_DISABLED: 403,
    PASSWORD_REQUIRED: 200,
    INCORRECT_PASSWORD: 400,
  }
  const messageByError: Record<string, string> = {
    INVALID_CODE: 'Invalid invite code',
    EXPIRED: 'This invite has expired',
    LEAGUE_FULL: 'League is full',
    ALREADY_MEMBER: 'You are already in this league',
    INVITE_DISABLED: 'Invite link is currently disabled',
    PASSWORD_REQUIRED: 'This league requires a password',
    INCORRECT_PASSWORD: 'Incorrect password',
  }

  if (result.error === 'PASSWORD_REQUIRED' && result.preview) {
    return NextResponse.json({
      leagueId: result.preview.leagueId,
      name: result.preview.name,
      sport: result.preview.sport,
      requiresPassword: true,
      inviteExpired: result.preview.expired,
      inviteCode: result.preview.inviteCode,
    })
  }

  return NextResponse.json(
    {
      error: messageByError[result.error] ?? 'Unable to validate invite',
      errorCode: result.error,
      ...(result.preview
        ? {
            leagueId: result.preview.leagueId,
            name: result.preview.name,
            sport: result.preview.sport,
            requiresPassword: result.preview.requiresPassword,
            inviteExpired: result.preview.expired,
            inviteCode: result.preview.inviteCode,
          }
        : {}),
    },
    { status: statusByError[result.error] ?? 400 }
  )
}
