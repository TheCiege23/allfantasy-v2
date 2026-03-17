/**
 * POST: Deterministic AI manager trade decision for an orphan roster.
 * Body: { rosterId, proposalSummary, partnerRosterId?, assetsGiven?, assetsReceived? }
 * Returns: { decision: 'accept' | 'reject' | 'counter', reason } and logs the decision.
 * Does not execute the trade on platform; commissioner or platform flow executes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { logAction } from '@/lib/orphan-ai-manager/OrphanAIManagerService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  if (!uiSettings.orphanTeamAiManagerEnabled) {
    return NextResponse.json({ error: 'Orphan team AI manager is not enabled.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const rosterId = body.rosterId ?? body.roster_id
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const orphanRosterIds = await getOrphanRosterIdsForLeague(leagueId)
  if (!orphanRosterIds.includes(rosterId)) {
    return NextResponse.json({ error: 'Roster is not an orphan; AI manager only acts for orphan rosters.' }, { status: 400 })
  }

  const proposalSummary = body.proposalSummary ?? body.proposal_summary ?? ''
  const partnerRosterId = body.partnerRosterId ?? body.partner_roster_id ?? null
  const assetsGiven = body.assetsGiven ?? body.assets_given ?? []
  const assetsReceived = body.assetsReceived ?? body.assets_received ?? []

  // Deterministic rule: no arbitrary trade execution. Use simple safety checks.
  // Reject if proposal is empty or missing required context; otherwise return a conservative decision with reason.
  const hasContext = proposalSummary?.trim().length > 0 || (Array.isArray(assetsGiven) && Array.isArray(assetsReceived) && (assetsGiven.length > 0 || assetsReceived.length > 0))
  let decision: 'accept' | 'reject' | 'counter' = 'reject'
  let reason = 'Trade evaluation requires league-specific rules and fairness analysis; defaulting to reject for safety.'

  if (hasContext) {
    // Placeholder: in a full implementation you would run trade engine (runTradeAnalysis or equivalent) for the orphan roster
    // and derive accept/reject/counter from fairness score and league rules. Here we keep deterministic reject with reason.
    reason = 'AI manager trade decisions use deterministic analysis; this proposal was not evaluated (evaluate via trade analyzer and apply manually if desired).'
  }

  const d = decision as 'accept' | 'reject' | 'counter'
  const action = d === 'accept' ? 'trade_accept' : d === 'counter' ? 'trade_counter' : 'trade_reject'
  await logAction({
    leagueId,
    rosterId,
    action,
    payload: {
      proposalSummary: String(proposalSummary).slice(0, 500),
      partnerRosterId,
      assetsGiven,
      assetsReceived,
      decision,
    },
    reason,
    triggeredBy: userId,
  })

  return NextResponse.json({
    ok: true,
    decision,
    reason,
    logged: true,
  })
}
