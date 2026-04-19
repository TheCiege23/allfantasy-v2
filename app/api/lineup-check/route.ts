import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'

export const dynamic = 'force-dynamic'

/** @deprecated Prefer `LineupActionSummaryPayload` from `@/lib/lineup-actions/types` */
export type LineupCheckResult = {
  totalIssues: number
  leagues: Array<{
    leagueId: string
    leagueName: string
    leagueAvatar: string | null
    sport: string
    issues: Array<{
      type: string
      message: string
      playerName?: string
      position?: string
      severity: 'critical' | 'warning' | 'info'
    }>
    chimmyAdvice: string
  }>
}

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await computeLineupActionsForUser(userId)
  const withChimmy = await attachChimmyAdviceToLineupSummary(summary, userId)
  return NextResponse.json(withChimmy)
}
