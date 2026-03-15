/**
 * POST /api/gm-economy/explain
 * Body: { managerId }. Returns a short narrative explaining the manager's career progression (for AI "Explain" button).
 */

import { NextResponse } from 'next/server'
import { getFranchiseProfileByManager } from '@/lib/gm-economy/GMProfileQueryService'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }

    const profile = await getFranchiseProfileByManager(managerId)
    if (!profile) {
      return NextResponse.json({
        managerId,
        narrative:
          'No franchise profile yet. Run the GM economy from the Career tab (or Settings) to generate your career progression and franchise value.',
        source: 'none',
      })
    }

    const parts: string[] = []
    parts.push(
      `GM Tier: ${profile.tierLabel ?? 'N/A'}. Prestige: ${profile.gmPrestigeScore.toFixed(1)}/100. Franchise value: ${profile.franchiseValue.toFixed(0)}.`
    )
    parts.push(
      `Career: ${profile.totalCareerSeasons} seasons across ${profile.totalLeaguesPlayed} leagues. Championships: ${profile.championshipCount}. Playoff appearances: ${profile.playoffAppearances}.`
    )
    parts.push(
      `Win rate: ${(profile.careerWinPercentage * 100).toFixed(1)}%.`
    )

    const narrative = parts.join(' ')

    return NextResponse.json({
      managerId,
      narrative,
      source: 'gm_economy',
      tierLabel: profile.tierLabel,
      gmPrestigeScore: profile.gmPrestigeScore,
      franchiseValue: profile.franchiseValue,
    })
  } catch (e) {
    console.error('[gm-economy/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain' },
      { status: 500 }
    )
  }
}
