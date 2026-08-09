import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Body = {
  mode?: 'single' | 'individual'
  /** ISO timestamp — required when mode === 'single'. Stamped on every feeder league. */
  scheduledFor?: string
  /** When mode === 'individual', map of leagueId → ISO timestamp. */
  perLeague?: Record<string, string>
}

function parseIso(s: unknown): Date | null {
  if (typeof s !== 'string' || !s.trim()) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

async function loadUniverseForCommissioner(universeId: string, userId: string) {
  const universe = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    select: { id: true, settings: true, commissionedByUserId: true, createdByUserId: true, leagues: { select: { leagueId: true } } },
  })
  if (!universe) return { error: 'Not found', status: 404 as const }
  const ownerId = universe.commissionedByUserId ?? universe.createdByUserId ?? null
  if (!ownerId || ownerId !== userId) {
    return { error: 'Commissioner only', status: 403 as const }
  }
  return { universe }
}

/** GET → return current schedule shape (mode + per-league dates). */
export async function GET(_req: Request, { params }: { params: Promise<{ universeId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { universeId } = await params
  const result = await loadUniverseForCommissioner(universeId, session.user.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const settings = (result.universe.settings as Record<string, unknown> | null) ?? {}
  const draftSchedule = (settings.draftSchedule as Record<string, unknown> | null) ?? null
  return NextResponse.json({
    universeId: result.universe.id,
    draftSchedule: draftSchedule ?? { mode: 'individual', perLeague: {} },
  })
}

/**
 * POST → set the universe's draft scheduling mode.
 *   mode='single'     : commissioner picks one timestamp; we stamp it on every
 *                       feeder league's draftDate so the standard draft engine
 *                       picks it up unchanged.
 *   mode='individual' : commissioner sends a per-league map. Each entry gets
 *                       written to that league's draftDate.
 *
 * We persist the chosen mode + per-league overrides in
 * ZombieUniverse.settings.draftSchedule for audit + UI re-hydration.
 */
export async function POST(req: Request, { params }: { params: Promise<{ universeId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { universeId } = await params
  const result = await loadUniverseForCommissioner(universeId, session.user.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mode = body.mode === 'single' ? 'single' : body.mode === 'individual' ? 'individual' : null
  if (!mode) return NextResponse.json({ error: "mode must be 'single' or 'individual'" }, { status: 400 })

  const universeLeagueIds = result.universe.leagues.map((l) => l.leagueId).filter(Boolean) as string[]
  const written: Record<string, string> = {}

  if (mode === 'single') {
    const when = parseIso(body.scheduledFor)
    if (!when) return NextResponse.json({ error: "scheduledFor (ISO timestamp) required for mode='single'" }, { status: 400 })
    for (const leagueId of universeLeagueIds) {
      await prisma.leagueSettings
        .updateMany({ where: { leagueId }, data: { draftDateUtc: when } })
        .catch(() => {})
      written[leagueId] = when.toISOString()
    }
  } else {
    const perLeague = body.perLeague ?? {}
    for (const leagueId of universeLeagueIds) {
      const when = parseIso(perLeague[leagueId])
      if (!when) continue
      await prisma.leagueSettings
        .updateMany({ where: { leagueId }, data: { draftDateUtc: when } })
        .catch(() => {})
      written[leagueId] = when.toISOString()
    }
    if (Object.keys(written).length === 0) {
      return NextResponse.json({ error: "perLeague map must include at least one valid ISO timestamp" }, { status: 400 })
    }
  }

  const settings = (result.universe.settings as Record<string, unknown> | null) ?? {}
  await prisma.zombieUniverse.update({
    where: { id: universeId },
    data: {
      settings: {
        ...settings,
        draftSchedule: {
          mode,
          perLeague: written,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  })

  return NextResponse.json({ ok: true, mode, scheduled: written })
}
