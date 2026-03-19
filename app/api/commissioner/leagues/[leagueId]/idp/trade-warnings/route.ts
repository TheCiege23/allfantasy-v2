/**
 * GET: Trade legality warnings involving defenders (IDP lineup impact).
 * Commissioner only. Returns recent trade-evaluator results that had idpLineupWarning, or instructions.
 * Trade evaluator already computes idpLineupWarning per request; this endpoint documents how to inspect.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { isIdpLeague } from '@/lib/idp'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await assertCommissioner(leagueId, session.user.id)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  // Trade evaluator API (POST /api/trade-evaluator) accepts a proposed trade and returns idpLineupWarning
  // when a side would not have enough IDP-eligible players to field a legal lineup. There is no stored
  // list of "trade warnings"; commissioners inspect by running the evaluator for specific trades.
  return NextResponse.json({
    message: 'IDP trade lineup warnings are computed per trade by the trade evaluator. Use POST /api/trade-evaluator with leagueId and the proposed trade to get idpLineupWarning in the response.',
    leagueId,
  })
}
