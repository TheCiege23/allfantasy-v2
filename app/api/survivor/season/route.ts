import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner, assertLeagueMember } from '@/lib/league/league-access'
import { seedIdolsAfterDraft } from '@/lib/survivor/idolEngine'
import { assignPlayersToTribes } from '@/lib/survivor/tribeEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueCommissioner(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      survivorMode: true,
      survivorPhase: 'drafting',
      survivorPlayerCount: typeof body.playerCount === 'number' ? body.playerCount : undefined,
      survivorTribeCount: typeof body.tribeCount === 'number' ? body.tribeCount : undefined,
      survivorMergeWeek: typeof body.survivorMergeWeek === 'number' ? body.survivorMergeWeek : undefined,
    },
  })

  await prisma.survivorLeagueConfig.upsert({
    where: { leagueId },
    create: {
      leagueId,
      tribeCount: typeof body.tribeCount === 'number' ? (body.tribeCount as number) : 4,
      tribeSize: typeof body.tribeSize === 'number' ? (body.tribeSize as number) : 5,
    },
    update: {
      tribeCount: typeof body.tribeCount === 'number' ? (body.tribeCount as number) : undefined,
      tribeSize: typeof body.tribeSize === 'number' ? (body.tribeSize as number) : undefined,
    },
  })

  await prisma.exileIsland.upsert({
    where: { leagueId },
    create: { leagueId },
    update: {},
  })

  try {
    await assignPlayersToTribes(leagueId, 'auto')
  } catch {
    /* tribes may already exist — commissioner can re-run tribes route */
  }
  const existingIdols = await prisma.survivorIdol.count({ where: { leagueId } })
  if (existingIdols === 0) {
    await seedIdolsAfterDraft(leagueId, 'random').catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      survivorPhase: true,
      survivorMode: true,
      survivorTribeCount: true,
      survivorMergeWeek: true,
    },
  })
  const tribes = await prisma.survivorTribe.findMany({ where: { leagueId }, include: { members: true } })
  const players = await prisma.survivorPlayer.findMany({ where: { leagueId } })
  const council = await prisma.survivorTribalCouncil.findFirst({
    where: { leagueId, status: { in: ['voting_open', 'voting_closed', 'revealing'] } },
    orderBy: { week: 'desc' },
  })
  const challenge = await prisma.survivorChallenge.findFirst({
    where: { leagueId, status: { in: ['open', 'locked'] } },
    orderBy: { week: 'desc' },
  })
  const exile = await prisma.exileIsland.findUnique({ where: { leagueId } })
  const jury = await prisma.jurySession.findUnique({ where: { leagueId } })
  const me = await prisma.survivorPlayer.findFirst({ where: { leagueId, userId } })

  return NextResponse.json({
    phase: league?.survivorPhase,
    mode: league?.survivorMode,
    tribes,
    players,
    activeCouncil: council,
    currentChallenge: challenge,
    exileStatus: exile,
    juryStatus: jury,
    userState: me,
  })
}
