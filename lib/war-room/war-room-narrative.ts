import { runCostControlledOpenAIText } from '@/lib/ai-cost-control'
import type { WarRoomIntelligenceResult } from './draft-intelligence-engine'

export type WarRoomNarrativeLayer = {
  headline: string
  body: string
  source: 'openai' | 'deterministic'
  model?: string
}

function deterministicNarrative(intel: WarRoomIntelligenceResult): WarRoomNarrativeLayer {
  const p = intel.pickNow
  return {
    headline: `Lean: ${p.playerName} (${p.position})`,
    body: [
      intel.takeVsWait.headline,
      ...intel.takeVsWait.bullets.slice(0, 3),
      intel.scarcityAlerts[0] ? `Scarcity: ${intel.scarcityAlerts[0]}` : '',
      intel.stackOpportunities[0]
        ? `Stack: ${intel.stackOpportunities[0].playerName} — ${intel.stackOpportunities[0].reason}`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    source: 'deterministic',
  }
}

/**
 * Optional OpenAI voice layer — never overrides numeric intelligence; explanation only.
 */
export async function buildWarRoomNarrativeLayer(args: {
  intelligence: WarRoomIntelligenceResult
  leagueName?: string | null
  sport: string
}): Promise<WarRoomNarrativeLayer> {
  const fallback = deterministicNarrative(args.intelligence)
  const enableAI = Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY)

  const compact = JSON.stringify({
    pick: args.intelligence.pickNow.playerName,
    pos: args.intelligence.pickNow.position,
    mode: args.intelligence.strategyMode.brainMode,
    confidence: args.intelligence.confidencePct,
    take: args.intelligence.takeVsWait.primary,
    scarcity: args.intelligence.scarcityAlerts.slice(0, 2),
  })

  const res = await runCostControlledOpenAIText({
    feature: 'war_room_narrative',
    enableAI,
    temperature: 0.35,
    maxTokens: 220,
    fallbackText: `${fallback.headline}. ${fallback.body}`,
    messages: [
      {
        role: 'system',
        content:
          'You are Chimmy, a calm fantasy draft assistant. Given ONLY the JSON facts below, write 2 short sentences: (1) why this pick fits the mode, (2) one risk or contingency. Do not invent stats or news. No hype.',
      },
      {
        role: 'user',
        content: `League: ${args.leagueName ?? 'league'} · Sport: ${args.sport}\nFacts: ${compact}`,
      },
    ],
    cacheContext: compact,
    cacheTtlMs: 120_000,
    repeatCooldownMs: 8_000,
  })

  const text = (res.text ?? '').trim()
  if (!res.ok || !text) {
    return fallback
  }

  return {
    headline: fallback.headline,
    body: text,
    source: res.source === 'ai' || res.source === 'cache' ? 'openai' : 'deterministic',
    model: res.model,
  }
}
