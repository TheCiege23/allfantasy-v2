import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTournament } from '@/lib/tournament-mode/TournamentCreationService'
import { validateCommissionerLeagueNames } from '@/lib/tournament-mode/LeagueNamingService'
import { DEFAULT_TOURNAMENT_SETTINGS } from '@/lib/tournament-mode/constants'
import type { TournamentSettings } from '@/lib/tournament-mode/types'
import { z } from 'zod'

const createBodySchema = z.object({
  name: z.string().min(1).max(120),
  sport: z.string().min(1).max(8),
  season: z.number().int().optional(),
  variant: z.string().max(32).optional(),
  settings: z.record(z.unknown()).optional(),
  hubSettings: z.record(z.unknown()).optional(),
  conferenceNames: z.tuple([z.string(), z.string()]).optional(),
  leagueNames: z.array(z.string()).optional(),
})

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { name, sport, season, variant, settings, hubSettings, conferenceNames, leagueNames } = parsed.data
  const mergedSettings: Partial<TournamentSettings> = {
    ...DEFAULT_TOURNAMENT_SETTINGS,
    ...settings,
  }

  if (mergedSettings.leagueNamingMode === 'commissioner_custom' && leagueNames?.length) {
    const validation = validateCommissionerLeagueNames(leagueNames)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(' ') },
        { status: 400 }
      )
    }
  }

  try {
    const result = await createTournament({
      name,
      sport,
      creatorId: userId,
      season,
      variant: variant ?? 'black_vs_gold',
      settings: mergedSettings,
      hubSettings,
      conferenceNames,
      leagueNames,
    })
    return NextResponse.json({
      tournamentId: result.tournamentId,
      leagueIds: result.leagueIds,
      inviteDistribution: result.inviteDistribution,
      conferenceNames: result.conferenceNames,
    })
  } catch (err) {
    console.error('[tournament/create] Error:', err)
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    )
  }
}
