/**
 * GET/PATCH /api/tournament/[tournamentId]/theme — Tournament banner/theme (hubSettings).
 * PROMPT 5: bannerUrl, themePack (tribal|jungle|torch|sand|battle|default), accentColor, glowAccent, conference badge styling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const THEME_PACKS = ['default', 'tribal', 'jungle', 'torch', 'sand', 'battle'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const theme = {
    bannerUrl: (hubSettings.bannerUrl as string) ?? null,
    themePack: (hubSettings.themePack as string) ?? 'default',
    accentColor: (hubSettings.accentColor as string) ?? null,
    glowAccent: (hubSettings.glowAccent as string) ?? null,
    badgeStyle: (hubSettings.badgeStyle as string) ?? null,
  }
  return NextResponse.json({ theme })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const hubSettings = { ...((tournament.hubSettings as Record<string, unknown>) ?? {}) }
  if (typeof body.bannerUrl === 'string') hubSettings.bannerUrl = body.bannerUrl
  if (typeof body.themePack === 'string' && THEME_PACKS.includes(body.themePack as any)) {
    hubSettings.themePack = body.themePack
  }
  if (typeof body.accentColor === 'string') hubSettings.accentColor = body.accentColor
  if (typeof body.glowAccent === 'string') hubSettings.glowAccent = body.glowAccent
  if (typeof body.badgeStyle === 'string') hubSettings.badgeStyle = body.badgeStyle

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { hubSettings: hubSettings as object, updatedAt: new Date() },
  })

  return NextResponse.json({
    theme: {
      bannerUrl: hubSettings.bannerUrl ?? null,
      themePack: hubSettings.themePack ?? 'default',
      accentColor: hubSettings.accentColor ?? null,
      glowAccent: hubSettings.glowAccent ?? null,
      badgeStyle: hubSettings.badgeStyle ?? null,
    },
  })
}
