import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await computeLineupActionsForUser(userId)
  const withChimmy = await attachChimmyAdviceToLineupSummary(summary, userId)
  const intelligence = {
    schemaVersion: 1 as const,
    time: await buildAiTimeContextPayload(userId),
  }
  return NextResponse.json({ ...withChimmy, intelligence })
}
