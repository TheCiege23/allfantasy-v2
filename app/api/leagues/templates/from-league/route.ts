/**
 * POST /api/leagues/templates/from-league
 * Create a template from an existing league (body: { leagueId, name?, description? }).
 * User must own the league.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTemplatePayloadFromLeague } from '@/lib/league-templates/buildTemplatePayloadFromLeague'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; name?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      leagueVariant: true,
      scoring: true,
      isDynasty: true,
      rosterSize: true,
      settings: true,
    },
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found or access denied' }, { status: 404 })
  }

  const payload = buildTemplatePayloadFromLeague(league)
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : (league.name?.trim() || 'League template').slice(0, 120)
  const description =
    body.description !== undefined && body.description !== null
      ? String(body.description).trim().slice(0, 500)
      : null

  const template = await (prisma as any).leagueTemplate.create({
    data: {
      userId: session.user.id,
      name,
      description: description || undefined,
      payload,
    },
    select: { id: true, name: true, description: true, payload: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json(template)
}
