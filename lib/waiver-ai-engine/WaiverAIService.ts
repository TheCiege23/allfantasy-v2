import { runCostControlledOpenAIText } from '@/lib/ai-cost-control'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { suggestWaiverPickups } from './suggest'
import type { WaiverAIServiceInput, WaiverAIServiceOutput } from './types'

function buildDeterministicExplanation(input: {
  suggestions: WaiverAIServiceOutput['deterministic']['suggestions']
}): string {
  const top = input.suggestions[0]
  if (!top) {
    return 'No deterministic waiver recommendation was generated from the provided available players and team-needs context.'
  }

  const topDrivers = top.topDrivers?.map((driver) => driver.label).slice(0, 3) ?? []
  const driverText = topDrivers.length > 0 ? ` Drivers: ${topDrivers.join(', ')}.` : ''
  return `Top deterministic add is ${top.playerName} (${top.position}) with composite ${top.compositeScore}/100 and ${top.recommendation} priority.${driverText}`
}

function parseAIExplanation(raw: string): string | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    if (typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0) {
      return parsed.explanation.trim()
    }
    return null
  } catch {
    return null
  }
}

async function buildAIExplanation(input: {
  sport: WaiverAIServiceOutput['sport']
  deterministic: WaiverAIServiceOutput['deterministic']
  deterministicExplanation: string
}): Promise<string | null> {
  const topSuggestions = input.deterministic.suggestions.slice(0, 5).map((suggestion) => ({
    playerName: suggestion.playerName,
    position: suggestion.position,
    recommendation: suggestion.recommendation,
    compositeScore: suggestion.compositeScore,
    topDrivers: suggestion.topDrivers?.map((driver) => ({
      label: driver.label,
      detail: driver.detail,
    })),
  }))

  const ai = await runCostControlledOpenAIText({
    feature: 'waiver_ai_explanation',
    enableAI: true,
    fallbackText: null,
    cacheTtlMs: 5 * 60 * 1000,
    repeatCooldownMs: 10 * 1000,
    cacheContext: { sport: input.sport, topSuggestions },
    messages: [
      {
        role: 'system',
        content:
          'You explain waiver recommendations. Use only deterministic output provided. Do not invent players, scores, or needs. Return JSON only.',
      },
      {
        role: 'user',
        content: [
          'Explain the deterministic waiver suggestions below in 2-3 concise sentences.',
          `Sport: ${input.sport}`,
          `Deterministic explanation: ${input.deterministicExplanation}`,
          `Suggestions: ${JSON.stringify(topSuggestions)}`,
          'Return JSON only:',
          '{"explanation":"clear, concise explanation"}',
        ].join('\n'),
      },
    ],
    temperature: 0.35,
    maxTokens: 220,
  })

  if (!ai.ok || !ai.text?.trim()) return null
  return parseAIExplanation(ai.text)
}

/**
 * PROMPT 239 — Waiver AI service:
 * deterministic recommendations from available players + team needs,
 * with optional AI explanation layered on top.
 */
export async function runWaiverAIService(
  input: WaiverAIServiceInput
): Promise<WaiverAIServiceOutput> {
  const sport = normalizeToSupportedSport(input.sport)
  const deterministicResult = suggestWaiverPickups(input)
  const deterministicExplanation = buildDeterministicExplanation({
    suggestions: deterministicResult.suggestions,
  })

  const output: WaiverAIServiceOutput = {
    sport,
    deterministic: {
      suggestions: deterministicResult.suggestions,
      basedOn: ['available_players', 'team_needs'],
    },
    explanation: {
      source: 'deterministic',
      text: deterministicExplanation,
    },
  }

  if (!input.includeAIExplanation) return output

  const aiExplanation = await buildAIExplanation({
    sport,
    deterministic: output.deterministic,
    deterministicExplanation,
  })
  if (aiExplanation) {
    output.explanation = {
      source: 'ai',
      text: aiExplanation,
    }
  }

  return output
}
