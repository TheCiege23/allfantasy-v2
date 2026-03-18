/**
 * GET /api/viral/context?type=league_invite&code=XXX
 * Sets httpOnly cookie af_league_invite for growth attribution on signup (PROMPT 291).
 * Call when user lands on /join?code=XXX so that after register we can attribute to league_invite.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateLeagueJoin } from '@/lib/league-privacy'

export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'af_league_invite'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (type !== 'league_invite' || !code) {
    return NextResponse.json({ error: 'Missing type or code' }, { status: 400 })
  }

  const result = await validateLeagueJoin(code).catch(() => ({ valid: false as const }))
  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, code, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
