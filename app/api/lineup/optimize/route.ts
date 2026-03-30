import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import {
  explainOptimizedLineup,
  optimizeLineupDeterministic,
  type OptimizerPlayerInput,
  type OptimizerSlotInput,
} from '@/lib/lineup-optimizer-engine'

export const dynamic = 'force-dynamic'

type OptimizeLineupBody = {
  leagueId?: string
  sport?: string
  useAIExplanation?: boolean
  players?: Array<{
    id?: string
    name?: string
    team?: string
    projectedPoints?: number
    positions?: string[]
    position?: string
  }>
  slots?: OptimizerSlotInput[]
  rosterSlots?: string[]
}

function normalizePlayers(body: OptimizeLineupBody): OptimizerPlayerInput[] {
  return (body.players ?? [])
    .map((player) => {
      const positions = Array.isArray(player.positions) ? player.positions : []
      if (player.position) positions.push(player.position)
      return {
        id: player.id,
        name: String(player.name ?? '').trim(),
        team: player.team,
        projectedPoints: Number(player.projectedPoints ?? 0),
        positions,
      }
    })
    .filter((player) => player.name.length > 0)
}

function normalizeSlots(body: OptimizeLineupBody): OptimizerSlotInput[] | undefined {
  if (Array.isArray(body.slots) && body.slots.length > 0) return body.slots
  if (Array.isArray(body.rosterSlots) && body.rosterSlots.length > 0) {
    return body.rosterSlots.map((slotCode, index) => ({
      id: `${slotCode}-${index + 1}`,
      code: slotCode,
    }))
  }
  return undefined
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as
    | { user?: { id?: string } }
    | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: OptimizeLineupBody
  try {
    body = (await req.json()) as OptimizeLineupBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.leagueId) {
    try {
      await assertLeagueMember(body.leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const players = normalizePlayers(body)
  if (players.length === 0) {
    return NextResponse.json(
      { error: 'players must include at least one valid player row' },
      { status: 400 }
    )
  }

  try {
    const result = optimizeLineupDeterministic({
      sport: body.sport,
      players,
      slots: normalizeSlots(body),
    })
    const explanation = await explainOptimizedLineup({
      result,
      useAI: Boolean(body.useAIExplanation),
    })

    return NextResponse.json({
      ok: true,
      deterministic: true,
      result,
      explanation,
    })
  } catch (error) {
    console.error('[lineup/optimize]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize lineup' },
      { status: 500 }
    )
  }
}
