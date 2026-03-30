import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { generateMatchupStory } from '@/lib/matchup-story-engine'

const SUPPORTED_SPORTS_ENUM = SUPPORTED_SPORTS as [
  (typeof SUPPORTED_SPORTS)[number],
  ...(typeof SUPPORTED_SPORTS)[number][],
]

const RequestSchema = z.object({
  sport: z.enum(SUPPORTED_SPORTS_ENUM).optional(),
  teamAName: z.string().min(1),
  teamBName: z.string().min(1),
  projectedScoreA: z.number().finite(),
  projectedScoreB: z.number().finite(),
  winProbabilityA: z.number().min(0).max(1),
  winProbabilityB: z.number().min(0).max(1),
  upsetChance: z.number().min(0).max(100).optional(),
  volatilityTag: z.enum(['low', 'medium', 'high']).optional(),
})

export async function POST(req: Request) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const result = await generateMatchupStory(parsed.data)
  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'Failed to generate matchup narrative',
        details: result.error,
      },
      { status: result.status || 503 }
    )
  }

  return NextResponse.json({
    sport: result.sport,
    narrative: result.narrative,
    source: result.source,
    model: result.model,
  })
}
