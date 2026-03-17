/**
 * GET    /api/leagues/templates/[templateId] — get one (owner only)
 * PATCH  /api/leagues/templates/[templateId] — update name/description/payload (owner only)
 * DELETE /api/leagues/templates/[templateId] — delete (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LeagueTemplatePayload } from '@/lib/league-templates/types'

async function getTemplateAndCheckOwner(templateId: string, userId: string) {
  const template = await (prisma as any).leagueTemplate.findUnique({
    where: { id: templateId },
  })
  if (!template) return null
  if (template.userId !== userId) return 'forbidden'
  return template
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { templateId } = await params
  const template = await getTemplateAndCheckOwner(templateId, session.user.id)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
  if (template === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    description: template.description,
    payload: template.payload,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { templateId } = await params
  const existing = await getTemplateAndCheckOwner(templateId, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
  if (existing === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { name?: string; description?: string; payload?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: { name?: string; description?: string | null; payload?: LeagueTemplatePayload } = {}
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Name must be 1–120 characters' }, { status: 400 })
    }
    data.name = name
  }
  if (body.description !== undefined) {
    data.description =
      body.description !== null && body.description !== undefined
        ? String(body.description).trim().slice(0, 500)
        : null
  }
  if (body.payload !== undefined) {
    if (typeof body.payload !== 'object' || body.payload === null || Array.isArray(body.payload)) {
      return NextResponse.json({ error: 'payload must be an object' }, { status: 400 })
    }
    data.payload = body.payload as LeagueTemplatePayload
  }

  const updated = await (prisma as any).leagueTemplate.update({
    where: { id: templateId },
    data,
    select: { id: true, name: true, description: true, payload: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { templateId } = await params
  const existing = await getTemplateAndCheckOwner(templateId, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
  if (existing === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await (prisma as any).leagueTemplate.delete({ where: { id: templateId } })
  return NextResponse.json({ ok: true })
}
