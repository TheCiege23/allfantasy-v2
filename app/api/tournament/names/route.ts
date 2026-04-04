import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateConferenceName,
  generateLeagueNamesForConference,
  recordName,
} from '@/lib/tournament/namingEngine'
import { assertTournamentCommissioner } from '@/lib/tournament/shellAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  try {
    await assertTournamentCommissioner(tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.tournamentNameRecord.findMany({
    where: { tournamentId },
    orderBy: { createdAt: 'asc' },
  })
  const grouped: Record<string, typeof rows> = {}
  for (const r of rows) {
    grouped[r.entityType] = grouped[r.entityType] ?? []
    grouped[r.entityType]!.push(r)
  }
  return NextResponse.json({ records: grouped })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tournamentId?: string; entityId?: string; entityType?: string; newName?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.tournamentId || !body.entityId || !body.entityType || !body.newName?.trim()) {
    return NextResponse.json({ error: 'tournamentId, entityId, entityType, newName required' }, { status: 400 })
  }

  try {
    await assertTournamentCommissioner(body.tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const name = body.newName.trim()
  const clash = await prisma.tournamentLeague.findFirst({
    where: { tournamentId: body.tournamentId, name, NOT: { id: body.entityId } },
  })
  if (clash) return NextResponse.json({ error: 'Name already used in tournament' }, { status: 409 })

  if (body.entityType === 'league') {
    await prisma.tournamentLeague.update({ where: { id: body.entityId }, data: { name } })
  } else if (body.entityType === 'conference') {
    await prisma.tournamentConference.update({ where: { id: body.entityId }, data: { name } })
  }

  await prisma.tournamentNameRecord.updateMany({
    where: { tournamentId: body.tournamentId, entityId: body.entityId },
    data: { finalName: name, wasEdited: true },
  })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tournamentId?: string; action?: string; entityType?: string; entityId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.action !== 'regenerate' || !body.tournamentId || !body.entityType || !body.entityId) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    await assertTournamentCommissioner(body.tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.tournamentNameRecord.findMany({
    where: { tournamentId: body.tournamentId },
    select: { finalName: true },
  })
  const names = existing.map((e) => e.finalName)

  if (body.entityType === 'conference') {
    const conf = await prisma.tournamentConference.findUnique({ where: { id: body.entityId } })
    if (!conf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const next = generateConferenceName(body.tournamentId, conf.conferenceNumber, names)
    await prisma.tournamentConference.update({ where: { id: conf.id }, data: { name: next } })
    await recordName(body.tournamentId, 'conference', conf.id, next, next, 'auto')
    return NextResponse.json({ name: next })
  }

  if (body.entityType === 'league') {
    const league = await prisma.tournamentLeague.findUnique({ where: { id: body.entityId } })
    if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const [next] = generateLeagueNamesForConference(league.conferenceId ?? '', 1, names)
    if (!next) return NextResponse.json({ error: 'Could not generate' }, { status: 500 })
    await prisma.tournamentLeague.update({ where: { id: league.id }, data: { name: next } })
    await recordName(body.tournamentId, 'league', league.id, next, next, 'auto')
    return NextResponse.json({ name: next })
  }

  return NextResponse.json({ error: 'Unsupported entityType' }, { status: 400 })
}
