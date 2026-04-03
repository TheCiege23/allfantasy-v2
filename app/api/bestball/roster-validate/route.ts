import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateBestBallRoster } from '@/lib/bestball/rosterValidator'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: {
    players?: { position: string; playerId?: string }[]
    sport?: string
    variant?: string
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
  if (!template) {
    return NextResponse.json({ error: 'Unknown sport/variant template' }, { status: 400 })
  }

  const players = body.players ?? []
  const result = validateBestBallRoster(players, template)
  return NextResponse.json(result)
}
