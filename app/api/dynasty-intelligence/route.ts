/**
 * Dynasty Intelligence API (PROMPT 137).
 * GET ?sport=NFL&position=WR&age=25&baseValue=5000&playerId=...
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getPlayerDynastyIntelligence,
  getDynastyIntelligenceSupportedSports,
} from '@/lib/dynasty-intelligence'
import { getDynastyAIInsight } from '@/lib/dynasty-intelligence/DynastyIntelligenceAI'
import { isSupportedSport } from '@/lib/sport-scope'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.trim() ?? undefined
    const position = searchParams.get('position')?.trim() ?? undefined
    const ageParam = searchParams.get('age')
    const age = ageParam != null ? parseInt(ageParam, 10) : undefined
    const baseValueParam = searchParams.get('baseValue')
    const baseValue = baseValueParam != null ? parseFloat(baseValueParam) : undefined
    const playerId = searchParams.get('playerId')?.trim() ?? undefined
    const includeAI = searchParams.get('ai') === '1' || searchParams.get('ai') === 'true'

    if (!sport || !isSupportedSport(sport)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing sport',
          supported: getDynastyIntelligenceSupportedSports(),
        },
        { status: 400 }
      )
    }

    const result = await getPlayerDynastyIntelligence({
      sport,
      position,
      age: Number.isFinite(age) ? age! : undefined,
      baseValue: Number.isFinite(baseValue) ? baseValue! : undefined,
      playerId,
    })

    if (includeAI) {
      const insight = await getDynastyAIInsight(result)
      return NextResponse.json({ data: result, insight })
    }
    return NextResponse.json({ data: result })
  } catch (e) {
    console.error('[dynasty-intelligence]', e)
    return NextResponse.json(
      { error: 'Failed to compute dynasty intelligence' },
      { status: 500 }
    )
  }
}
