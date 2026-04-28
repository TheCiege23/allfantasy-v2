import { NextRequest, NextResponse } from 'next/server'
import { generateTournamentLeverageReport } from '@/lib/bestball/ai/tournamentLeverage'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate
  const userId = gate

  let body: { entryId?: string; contestId?: string; sport?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.entryId || !body.contestId) {
    return NextResponse.json({ error: 'entryId and contestId required' }, { status: 400 })
  }

  const entry = await prisma.bestBallEntry.findFirst({
    where: { id: body.entryId, contestId: body.contestId, userId },
    select: { id: true },
  })
  if (!entry) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const report = await generateTournamentLeverageReport(
    body.entryId,
    body.contestId,
    normalizeToSupportedSport(body.sport ?? 'NFL'),
  )
  return NextResponse.json({ report })
}
