import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gradeBestBallRoster } from '@/lib/bestball/ai/rosterGrader'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate
  const userId = gate

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

  if (body.leagueId) {
    const leagueGate = await assertLeagueMember(body.leagueId, userId)
    if (!leagueGate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: leagueGate.status })
    if (body.rosterId) {
      const roster = await prisma.redraftRoster.findFirst({
        where: { id: body.rosterId, leagueId: body.leagueId },
        select: { id: true },
      })
      if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }
  } else if (body.rosterId) {
    const roster = await prisma.redraftRoster.findFirst({
      where: { id: body.rosterId },
      select: { leagueId: true },
    })
    if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    const leagueGate = await assertLeagueMember(roster.leagueId, userId)
    if (!leagueGate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: leagueGate.status })
  }

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
