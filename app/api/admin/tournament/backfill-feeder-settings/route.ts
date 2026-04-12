import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveAdminEmail } from '@/lib/auth/admin'
import { backfillTournamentFeederLeagueSettings } from '@/lib/tournament/backfillTournamentFeederLeagues'

/**
 * POST — one-time / occasional maintenance: backfill `league_type` + `leagueType`
 * for all `leagueVariant === tournament_mode` rows.
 */
export async function POST(_req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null }
  } | null

  if (!resolveAdminEmail(session?.user?.email || null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await backfillTournamentFeederLeagueSettings()
  return NextResponse.json({ status: 'ok', result })
}
