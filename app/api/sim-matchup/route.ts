import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deepseekChat } from '@/lib/deepseek-client'
import { getInjuries } from '@/lib/injuries'
import { getLiveScores } from '@/lib/live-scores'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { leagueId, teamAId, teamBId, sport = 'NFL' } = body as {
    leagueId?: string
    teamAId?: string
    teamBId?: string
    sport?: string
  }

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  try {
    const [injuries, scores, league] = await Promise.all([
      getInjuries(sport, { limit: 30 }),
      getLiveScores(sport, { hoursBack: 24 }),
      prisma.league.findUnique({ where: { id: leagueId }, select: { name: true, sport: true, scoring: true } }),
    ])

    const prompt = [
      `Simulate a fantasy matchup for league "${league?.name ?? 'League'}" (${sport}).`,
      teamAId ? `Team A ID: ${teamAId}` : '',
      teamBId ? `Team B ID: ${teamBId}` : '',
      `Current injuries: ${injuries.slice(0, 10).map((i) => `${i.playerName}(${i.team}): ${i.status}`).join(', ') || 'None'}`,
      `Recent scores: ${scores.slice(0, 5).map((g) => `${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore}`).join(', ') || 'No games'}`,
      `Return JSON: { winProbabilityA: number (0-100), winProbabilityB: number, projectedScoreA: number, projectedScoreB: number, keyFactors: string[], swingPlayers: string[] }`,
    ].filter(Boolean).join('\n')

    const result = await deepseekChat({
      prompt,
      systemPrompt: 'You are a quantitative fantasy sports simulation engine. Return only valid JSON.',
      temperature: 0.3,
      maxTokens: 800,
    })

    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(result.content)
    } catch {
      parsed = { raw: result.content, error: 'Failed to parse simulation result' }
    }

    return NextResponse.json({ ok: true, simulation: parsed, sport })
  } catch (e) {
    console.error('[sim-matchup]', e)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}
