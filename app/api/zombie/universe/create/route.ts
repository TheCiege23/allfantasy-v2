import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createZombieUniverseForTier } from '@/lib/zombie/setupEngine'
import type { ZombieUniverseTierId } from '@/lib/zombie/zombie-universe-tier'
import { isZombieEligibleLeagueSport } from '@/lib/zombie/zombie-sport-eligibility'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const schema = z.object({
  zombieUniverseTier: z.enum(['beta_trio', 'alpha_hex']),
  /** Same JSON shape as `POST /api/league/create` (native manual path). */
  leagueCreatePayload: z.record(z.unknown()),
})

/**
 * Creates a Zombie universe + multiple manual leagues (3- or 6-league tiers).
 * Each league is created via the standard `/api/league/create` handler (cookie-forwarded).
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { zombieUniverseTier, leagueCreatePayload } = parsed.data
  const sportRaw = leagueCreatePayload.sport
  const sport = typeof sportRaw === 'string' ? sportRaw.toUpperCase() : 'NFL'
  if (!isZombieEligibleLeagueSport(sport)) {
    return NextResponse.json({ error: 'Zombie universes cannot use Soccer as the sport.' }, { status: 400 })
  }

  const baseName =
    typeof leagueCreatePayload.name === 'string' && leagueCreatePayload.name.trim()
      ? String(leagueCreatePayload.name).trim()
      : `${sport} Zombie Universe`

  const universe = await createZombieUniverseForTier(session.user.id, {
    name: baseName,
    sport,
    tier: zombieUniverseTier as ZombieUniverseTierId,
  })

  const origin = new URL(req.url).origin
  const cookie = req.headers.get('cookie') ?? ''

  const created: { leagueId: string; name?: string | null; levelId: string | null; tierLabel: string | null }[] = []

  for (const level of universe.levels) {
    const slots = Math.max(1, level.leagueCount ?? 1)
    for (let i = 0; i < slots; i++) {
      const label = `${level.tierLabel ?? level.name} ${i + 1}`
      const merged = {
        ...leagueCreatePayload,
        name: `${baseName} — ${label}`,
        sport,
        settings: {
          ...(typeof leagueCreatePayload.settings === 'object' && leagueCreatePayload.settings !== null
            ? leagueCreatePayload.settings
            : {}),
          zombie_universe_id: universe.id,
          zombie_universe_tier: zombieUniverseTier,
          zombie_level_id: level.id,
          zombie_level_slot: `${level.tierLabel ?? 'Tier'}-${i + 1}`,
        },
      }

      const res = await fetch(`${origin}/api/league/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie,
        },
        body: JSON.stringify(merged),
      })

      const data = (await res.json().catch(() => ({}))) as { league?: { id?: string; name?: string | null }; error?: string }
      if (!res.ok) {
        return NextResponse.json(
          {
            error: data.error ?? 'League creation failed mid-universe',
            partial: created,
            universeId: universe.id,
          },
          { status: res.status >= 400 ? res.status : 500 },
        )
      }
      const leagueId = data.league?.id
      if (leagueId) {
        created.push({
          leagueId,
          name: data.league?.name ?? merged.name,
          levelId: level.id,
          tierLabel: level.tierLabel ?? level.name,
        })
        await fetch(`${origin}/api/zombie/league`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie },
          body: JSON.stringify({
            leagueId,
            sport,
            universeId: universe.id,
            tierId: level.id,
            name: merged.name,
            teamCount: typeof leagueCreatePayload.leagueSize === 'number' ? leagueCreatePayload.leagueSize : 12,
            isPaid: false,
            whispererSelectionMode:
              (merged.settings as Record<string, unknown>)?.zombie_whisperer_selection === 'veteran_priority'
                ? 'veteran_priority'
                : 'random',
          }),
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({
    success: true,
    universeId: universe.id,
    leagues: created,
    primaryLeagueId: created[0]?.leagueId ?? null,
  })
}
