import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { httpStatusForLeagueToolCode, leagueToolAccessUserMessage } from '@/lib/ai-tools/league-tool-access-messages'
import { resolveNormalizedLeagueContext } from '@/lib/league-context-engine'

export const dynamic = 'force-dynamic'

/**
 * Returns the normalized League Context Engine payload for dashboard + AI clients.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ ok: false, code: 'MISSING_USER_CONTEXT', error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await ctx.params
  if (!leagueId?.trim()) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_LEAGUE_ID', error: leagueToolAccessUserMessage('INVALID_LEAGUE_ID') },
      { status: 400 }
    )
  }

  const res = await resolveNormalizedLeagueContext({ userId, leagueId: leagueId.trim() })
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: res.code,
        error: leagueToolAccessUserMessage(res.code),
      },
      { status: httpStatusForLeagueToolCode(res.code) }
    )
  }

  return NextResponse.json({ ok: true, context: res.context })
}
