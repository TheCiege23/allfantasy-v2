/**
 * GET /api/leagues/join/preview?code=XXX
 * Preview league by invite code. Returns name, sport, requiresPassword.
 * Does not return leagueId until join is attempted (or we can return it for form submit).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateLeagueJoin } from '@/lib/league-privacy'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const result = await validateLeagueJoin(code)
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({
    leagueId: result.leagueId,
    name: result.name,
    sport: result.sport,
    requiresPassword: result.requiresPassword,
  })
}
