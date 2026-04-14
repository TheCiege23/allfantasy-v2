import { NextResponse } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { runTwoPlayerComparisonEngine } from '@/lib/player-comparison-lab'
import type { LeagueScoringSettings, ScoringFormat } from '@/lib/player-comparison-lab/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { buildAiPlayerComparisonResponse } from '@/lib/ai-player-comparison/build-decision'
import { parseScoringFormat } from '@/lib/ai-player-comparison/map-scoring-format'
import { normalizeStrategyMode } from '@/lib/ai-player-comparison/strategy-weights'
import type { AiPlayerComparisonRequest } from '@/lib/ai-player-comparison/types'

export const runtime = 'nodejs'

function leagueSettingsFromContext(body: AiPlayerComparisonRequest): LeagueScoringSettings | null {
  const slot = String(body.lineupSlot ?? '').toUpperCase()
  if (slot.includes('SUPERFLEX')) {
    return { superflex: true }
  }
  return null
}

export const POST = withApiUsage({ endpoint: '/api/ai/player-comparison', tool: 'player_comparison' })(
  async (req: Request) => {
    let body: AiPlayerComparisonRequest
    try {
      body = (await req.json()) as AiPlayerComparisonRequest
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const playerA = String(body.playerA ?? '').trim()
    const playerB = String(body.playerB ?? '').trim()
    if (!playerA || !playerB) {
      return NextResponse.json({ ok: false, error: 'playerA and playerB are required' }, { status: 400 })
    }

    const sport = normalizeToSupportedSport(body.sport)
    const scoringFormat = parseScoringFormat(
      typeof body.scoringFormat === 'string' ? body.scoringFormat : null
    ) as ScoringFormat | undefined
    const strategyMode = normalizeStrategyMode(
      typeof body.strategyMode === 'string' ? body.strategyMode : 'balanced'
    )
    const includeAi = Boolean(body.includeAiNarrative)

    const leagueScoringSettings = leagueSettingsFromContext(body)

    const engine = await runTwoPlayerComparisonEngine({
      playerAName: playerA,
      playerBName: playerB,
      sport,
      scoringFormat,
      leagueScoringSettings,
      includeAIExplanation: includeAi,
    })

    if (!engine) {
      return NextResponse.json(
        { ok: false, error: 'Could not resolve one or both players for this sport.' },
        { status: 404 }
      )
    }

    const lineupSlotLabel =
      typeof body.lineupSlot === 'string' && body.lineupSlot.trim()
        ? body.lineupSlot.trim().toUpperCase()
        : null

    const payload = buildAiPlayerComparisonResponse({
      engine,
      strategyMode,
      scoringFormat: scoringFormat ?? null,
      lineupSlotLabel,
    })

    return NextResponse.json(payload)
  }
)
