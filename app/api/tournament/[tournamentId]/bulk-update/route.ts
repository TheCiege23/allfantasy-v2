/**
 * POST /api/tournament/[tournamentId]/bulk-update — Update league names and/or conference theme in bulk.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { leagueNames?: Record<string, string>; conferenceThemes?: Record<string, { theme?: string; themePayload?: Record<string, unknown> }> } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const updates: string[] = []
  if (body.leagueNames && typeof body.leagueNames === 'object') {
    for (const [leagueId, name] of Object.entries(body.leagueNames)) {
      if (!name || typeof name !== 'string') continue
      const tl = await prisma.legacyTournamentLeague.findFirst({ where: { tournamentId, leagueId }, select: { id: true } })
      if (!tl) continue
      await prisma.league.update({
        where: { id: leagueId },
        data: { name: name.trim().slice(0, 120) },
      })
      updates.push(`league:${leagueId}:name`)
    }
  }
  if (body.conferenceThemes && typeof body.conferenceThemes === 'object') {
    for (const [conferenceId, payload] of Object.entries(body.conferenceThemes)) {
      if (!payload || typeof payload !== 'object') continue
      const conf = await prisma.legacyTournamentConference.findFirst({
        where: { tournamentId, id: conferenceId },
        select: { id: true },
      })
      if (!conf) continue
      const data: Record<string, unknown> = {}
      if (typeof payload.theme === 'string') data.theme = payload.theme
      if (payload.themePayload && typeof payload.themePayload === 'object') data.themePayload = payload.themePayload
      if (Object.keys(data).length > 0) {
        await prisma.legacyTournamentConference.update({
          where: { id: conferenceId },
          data: data as any,
        })
        updates.push(`conference:${conferenceId}:theme`)
      }
    }
  }

  if (updates.length > 0) {
    await logTournamentAudit(tournamentId, 'bulk_update', {
      actorId: userId,
      targetType: 'tournament',
      targetId: tournamentId,
      metadata: { updates },
    })
  }

  return NextResponse.json({ ok: true, updatesCount: updates.length, updates })
}
