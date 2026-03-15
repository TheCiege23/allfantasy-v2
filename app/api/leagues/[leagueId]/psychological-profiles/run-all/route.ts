import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runPsychologicalProfileEngine } from '@/lib/psychological-profiles/PsychologicalProfileEngine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/psychological-profiles/run-all
 * Run the psychological profile engine for every team/manager in the league.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: true },
    })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    const sport = (league.sport ?? 'NFL').toString()
    const results: { managerId: string; teamName?: string; ok: boolean; error?: string }[] = []

    for (const team of league.teams) {
      const managerId = team.externalId || team.id
      try {
        await runPsychologicalProfileEngine({
          leagueId,
          managerId,
          sport,
          sleeperUsername: team.ownerName,
          rosterId: undefined,
        })
        results.push({ managerId, teamName: team.teamName ?? team.ownerName, ok: true })
      } catch (err) {
        results.push({
          managerId,
          teamName: team.teamName ?? team.ownerName,
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const okCount = results.filter((r) => r.ok).length
    return NextResponse.json({
      leagueId,
      total: results.length,
      success: okCount,
      failed: results.length - okCount,
      results,
    })
  } catch (e) {
    console.error('[psychological-profiles/run-all POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run profiles' },
      { status: 500 }
    )
  }
}
