/**
 * GET  /api/leagues/templates — list current user's templates
 * POST /api/leagues/templates — create template (body: name, description?, payload)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LeagueTemplatePayload } from '@/lib/league-templates/types'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const list = await (prisma as any).leagueTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, payload: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ templates: list })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; description?: string; payload?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 120) {
    return NextResponse.json({ error: 'Name is required (max 120 characters)' }, { status: 400 })
  }

  const description =
    body.description !== undefined && body.description !== null
      ? String(body.description).trim().slice(0, 500)
      : null

  const payload = body.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'payload must be an object (wizard state)' }, { status: 400 })
  }

  const template = await (prisma as any).leagueTemplate.create({
    data: {
      userId: session.user.id,
      name,
      description: description || undefined,
      payload: payload as LeagueTemplatePayload,
    },
    select: { id: true, name: true, description: true, payload: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json(template)
}
