import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Public resolver for a Zombie universe-wide invite code. Walks every
 * ZombieUniverse and matches against settings.inviteToken (no JSON-path index
 * to lean on, but universe count is small so a sequential scan is fine).
 *
 * Returns the universe metadata plus the list of feeder leagues so the join
 * landing page can show "pick which league you want to join". Per-league join
 * still uses the standard /api/leagues/join flow.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const trimmed = code?.trim()
  if (!trimmed) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const universes = await prisma.zombieUniverse.findMany({
    include: {
      leagues: {
        include: {
          level: { select: { name: true, tierLabel: true } },
        },
      },
    },
  })

  const match = universes.find((u) => {
    const s = (u.settings as Record<string, unknown> | null) ?? {}
    return typeof s.inviteToken === 'string' && s.inviteToken === trimmed
  })

  if (!match) {
    return NextResponse.json({ error: 'Invite not found or revoked' }, { status: 404 })
  }

  // Pull each underlying League's invite token so the chosen league can be
  // joined via the existing /api/leagues/join surface.
  const leagueIds = match.leagues.map((l) => l.leagueId).filter((id): id is string => Boolean(id))
  const leagueRows = await prisma.league.findMany({
    where: { id: { in: leagueIds } },
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      invites: { select: { token: true, expiresAt: true } },
    },
  })
  const inviteByLeagueId = new Map<string, string | null>()
  for (const row of leagueRows) {
    const valid = row.invites.find((inv) => !inv.expiresAt || inv.expiresAt > new Date())
    inviteByLeagueId.set(row.id, valid?.token ?? null)
  }

  return NextResponse.json({
    universeId: match.id,
    name: match.name,
    sport: match.sport,
    status: match.status,
    leagues: match.leagues.map((l) => ({
      leagueId: l.leagueId,
      name: l.name,
      teamCount: l.teamCount,
      tierLabel: l.level?.tierLabel ?? l.level?.name ?? null,
      joinUrl:
        inviteByLeagueId.get(l.leagueId)
          ? `/join/${inviteByLeagueId.get(l.leagueId)}`
          : null,
    })),
  })
}
