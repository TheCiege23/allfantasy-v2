import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_MESSAGES = 200
const MAX_BODY_CHARS = 1000

type Msg = {
  id: string
  userId: string
  userName: string | null
  body: string
  createdAt: string
}

/**
 * Universe-wide chat for 3-/6-league zombie universes. Stored as a bounded
 * ring buffer in ZombieUniverse.settings.universeChat (last 200 messages) so
 * we don't need a new table mid-session — when the activity warrants it the
 * shape can lift to its own model with a lossless migration.
 *
 * Per-league chat is unaffected; this endpoint is *only* the universe-wide
 * forum every member of every feeder league can read + post to.
 */
async function loadUniverseForMember(universeId: string, userId: string) {
  const universe = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    select: {
      id: true,
      settings: true,
      commissionedByUserId: true,
      createdByUserId: true,
      leagues: { select: { leagueId: true } },
    },
  })
  if (!universe) return { error: 'Not found', status: 404 as const }

  const ownerId = universe.commissionedByUserId ?? universe.createdByUserId ?? null
  if (ownerId === userId) return { universe, role: 'commissioner' as const }

  // Member if user owns / claims a roster in any of the universe's leagues.
  const universeLeagueIds = universe.leagues.map((l) => l.leagueId).filter(Boolean) as string[]
  if (universeLeagueIds.length === 0) {
    return { error: 'Forbidden', status: 403 as const }
  }
  const member = await prisma.leagueTeam.findFirst({
    where: { leagueId: { in: universeLeagueIds }, claimedByUserId: userId },
    select: { id: true },
  })
  if (!member) return { error: 'Forbidden', status: 403 as const }
  return { universe, role: 'member' as const }
}

function readMessages(settings: unknown): Msg[] {
  if (!settings || typeof settings !== 'object') return []
  const arr = (settings as Record<string, unknown>).universeChat
  if (!Array.isArray(arr)) return []
  return arr.filter(
    (m): m is Msg =>
      m != null &&
      typeof m === 'object' &&
      typeof (m as Msg).id === 'string' &&
      typeof (m as Msg).userId === 'string' &&
      typeof (m as Msg).body === 'string',
  )
}

/** GET → last N universe chat messages (newest last). */
export async function GET(req: Request, { params }: { params: Promise<{ universeId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { universeId } = await params
  const access = await loadUniverseForMember(universeId, session.user.id)
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const messages = readMessages(access.universe.settings)
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(MAX_MESSAGES, Number(url.searchParams.get('limit') ?? 50)))
  return NextResponse.json({ messages: messages.slice(-limit) })
}

/** POST → append a message. Trims to MAX_MESSAGES. */
export async function POST(req: Request, { params }: { params: Promise<{ universeId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string; name?: string | null } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { universeId } = await params
  const access = await loadUniverseForMember(universeId, session.user.id)
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = (await req.json().catch(() => ({}))) as { body?: unknown }
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, MAX_BODY_CHARS) : ''
  if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  const settings = (access.universe.settings as Record<string, unknown> | null) ?? {}
  const existing = readMessages(settings)
  const next: Msg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: session.user.id,
    userName: (session.user as { name?: string | null }).name ?? null,
    body: text,
    createdAt: new Date().toISOString(),
  }
  const trimmed = [...existing, next].slice(-MAX_MESSAGES)

  await prisma.zombieUniverse.update({
    where: { id: universeId },
    data: { settings: { ...settings, universeChat: trimmed } },
  })

  return NextResponse.json({ ok: true, message: next })
}
