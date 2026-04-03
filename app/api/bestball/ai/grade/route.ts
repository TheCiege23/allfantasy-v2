import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gradeBestBallRoster } from '@/lib/bestball/ai/rosterGrader'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: {
    roster: { playerId: string; name: string; pos: string }[]
    sport?: string
    variant?: string
    draftSlot?: number
    leagueSize?: number
    leagueId?: string
    rosterId?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sport = normalizeToSupportedSport(body.sport ?? 'NFL')
  const variant = body.variant ?? 'standard'
  const template = await prisma.bestBallSportTemplate.findUnique({
    where: { sport_variant: { sport, variant } },
  })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 400 })

  const grade = await gradeBestBallRoster(
    body.roster ?? [],
    sport,
    variant,
    template,
    body.draftSlot ?? 1,
    body.leagueSize ?? 12,
    { leagueId: body.leagueId, rosterId: body.rosterId },
  )
  return NextResponse.json({ grade })
}
