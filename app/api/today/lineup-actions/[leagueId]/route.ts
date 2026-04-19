import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import { resolveNormalizedLeagueContext } from '@/lib/league-context-engine'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { estimateNextWaiversProcessUTC } from '@/lib/time-engine/estimateWaiverRun'
import type { FantasyTimeEngineExtras } from '@/lib/time-engine/fantasyTimePayload'
import { getServerNowUTC } from '@/lib/time-engine/serverClock'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await ctx.params
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const summary = await computeLineupActionsForUser(userId)
  const actions = summary.actions.filter((a) => a.leagueId === leagueId)
  const leagues = summary.leagues.filter((l) => l.leagueId === leagueId)
  const countable = actions.filter((a) => a.reasonType !== 'fetch_error' && a.severity !== 'info')
  const filtered = {
    ...summary,
    actions,
    leagues,
    totalIssues: countable.length,
    totalUnresolvedSlotActions: countable.length,
    leaguesNeedingAttention: leagues.length > 0 && countable.length > 0 ? 1 : 0,
    lineupsNeedingAttention: leagues.length > 0 && countable.length > 0 ? 1 : 0,
    urgentLineupActions: actions.filter((a) => a.urgency === 'urgent').length,
    scanWarningLeagues: leagues.some((l) => l.scanIncomplete) ? 1 : 0,
  }
  const withChimmy = await attachChimmyAdviceToLineupSummary(filtered, userId)

  let timeExtras: FantasyTimeEngineExtras | undefined
  const resolved = await resolveNormalizedLeagueContext({ userId, leagueId })
  if (resolved.ok) {
    const n = resolved.context
    const nextWaiver = estimateNextWaiversProcessUTC({
      leagueTimezone: n.timezone,
      waiverProcessTime: n.waiver.waiverProcessTime,
      serverNow: getServerNowUTC(),
    })
    timeExtras = { sportHint: n.sport, waiversProcessAt: nextWaiver?.toISOString() ?? null }
  }

  const intelligence = {
    schemaVersion: 1 as const,
    time: await buildAiTimeContextPayload(userId, timeExtras),
  }
  return NextResponse.json({ ...withChimmy, intelligence })
}
