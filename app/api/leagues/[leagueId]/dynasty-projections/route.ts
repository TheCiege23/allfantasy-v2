/**
 * GET /api/leagues/[leagueId]/dynasty-projections — fetch dynasty projections for a league.
 * POST — generate and persist projections (requires league context + team inputs; simplified for single-team or full league).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'
import { generateDynastyProjection } from '@/lib/dynasty-engine/DynastyProjectionGenerator'
import type { TeamDynastyInputs } from '@/lib/dynasty-projection/types'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  const sport = req.nextUrl.searchParams.get('sport') ?? undefined
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }
  try {
    const projections = await getDynastyProjectionsForLeague(leagueId, sport)
    return NextResponse.json({ projections })
  } catch (e) {
    console.error('[dynasty-projections GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load dynasty projections' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }
  let body: { teamInputs?: TeamDynastyInputs[]; persist?: boolean } = {}
  try {
    body = await req.json().catch(() => ({}))
  } catch {}
  const teamInputs = body.teamInputs ?? []
  const persist = Boolean(body.persist !== false)

  if (!Array.isArray(teamInputs) || teamInputs.length === 0) {
    return NextResponse.json(
      { error: 'teamInputs array required (leagueId, teamId, leagueContext, players, futurePicks per team)' },
      { status: 400 }
    )
  }

  try {
    const results = await Promise.all(
      teamInputs.map((input) =>
        generateDynastyProjection(
          { ...input, leagueId: input.leagueId || leagueId },
          { persist }
        )
      )
    )
    return NextResponse.json({ projections: results })
  } catch (e) {
    console.error('[dynasty-projections POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate dynasty projections' },
      { status: 500 }
    )
  }
}
