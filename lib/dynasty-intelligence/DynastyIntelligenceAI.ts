/**
 * Dynasty Intelligence AI (PROMPT 137).
 * DeepSeek: math validation.
 * Grok: narrative framing.
 * OpenAI: final actionable explanation.
 */
import { deepseekChat } from '@/lib/deepseek-client'
import { openaiChatText } from '@/lib/openai-client'
import { parseTextFromXaiChatCompletion, xaiChatJson } from '@/lib/xai-client'
import type { PlayerDynastyIntelligence } from './types'

function buildSummary(payload: PlayerDynastyIntelligence): string {
  const lines: string[] = [
    `Sport: ${payload.sport}`,
    `Position: ${payload.position}`,
    `Age: ${payload.age ?? 'unknown'}`,
    `Current value: ${payload.currentValue}`,
    `Lifecycle: ${payload.lifecycleStage}`,
    `Valuation band: ${payload.valuationBand}`,
    `Recommendation: ${payload.marketRecommendation}`,
    `Peak range: ${payload.ageCurve.peakAgeStart}-${payload.ageCurve.peakAgeEnd}`,
    `Cliff age: ${payload.ageCurve.cliffAge}`,
    `Risk band: ${payload.ageCurve.riskBand}`,
  ]

  if (payload.marketValueTrend) {
    lines.push(
      `Market trend: ${payload.marketValueTrend.direction}, score ${payload.marketValueTrend.trendScore.toFixed(1)}, delta ${payload.marketValueTrend.scoreDelta ?? 'N/A'}, demand ${payload.marketValueTrend.demandScore.toFixed(1)}, liquidity ${payload.marketValueTrend.liquidityScore.toFixed(1)}, volatility ${payload.marketValueTrend.volatilityScore.toFixed(1)}`
    )
  }
  if (payload.careerTrajectory) {
    const year3 = payload.careerTrajectory.points.find((point) => point.yearOffset === 3)
    const year5 = payload.careerTrajectory.points.find((point) => point.yearOffset === 5)
    lines.push(
      `Trajectory: ${payload.careerTrajectory.trajectoryLabel}, Y0=${payload.currentValue}, Y3=${year3?.projectedValue ?? 'N/A'}, Y5=${year5?.projectedValue ?? 'N/A'}, window ${payload.careerTrajectory.expectedWindowYears}`
    )
  }
  if (payload.valuationBreakdown) {
    lines.push(
      `Dynasty score: ${payload.valuationBreakdown.dynastyScore}, risk score ${payload.valuationBreakdown.riskScore}, market pulse ${payload.valuationBreakdown.marketPulse}`
    )
  }

  return lines.join('\n')
}

function buildFallbackMathValidation(payload: PlayerDynastyIntelligence): string {
  const score = payload.valuationBreakdown?.dynastyScore ?? payload.currentValue
  return `Valid: the age curve, market pulse, and trajectory align around a ${payload.lifecycleStage.toLowerCase()} profile with a dynasty score near ${score}.`
}

function buildFallbackNarrative(payload: PlayerDynastyIntelligence): string {
  const trend = payload.marketValueTrend?.direction ?? 'Stable'
  const trajectory = payload.careerTrajectory?.trajectoryLabel ?? 'Stable'
  if (payload.marketRecommendation === 'Buy') {
    return `${payload.position} carries an ascending dynasty story with runway still ahead, and the market is not fully pricing in that future arc.`
  }
  if (payload.marketRecommendation === 'Sell') {
    return `${payload.position} is drifting toward the back side of the curve, and the current market tone says this is a better window to move early than late.`
  }
  return `${payload.position} sits in a ${payload.lifecycleStage.toLowerCase()} window with ${trend.toLowerCase()} market momentum and a ${trajectory.toLowerCase()} long-term arc.`
}

function buildFallbackExplanation(payload: PlayerDynastyIntelligence): string {
  if (payload.marketRecommendation === 'Buy') {
    return `The curve and trajectory point to appreciating dynasty value, so this is a profile to acquire before the market fully catches up. Target the player now if the manager still prices them as a short-term asset.`
  }
  if (payload.marketRecommendation === 'Sell') {
    return `The cliff risk is becoming more visible than the market usually admits. If you can pivot this value into a younger cornerstone or future picks, this is the right time to do it.`
  }
  if (payload.marketRecommendation === 'Hold') {
    return `The profile still sits in a usable value window, so the best move is patience unless someone pays for the peak case. Hold and let the trajectory keep compounding.`
  }
  return `The signals are mixed enough that the best dynasty move is to monitor pricing rather than force action. Recheck the market after the next trend swing or usage spike.`
}

async function requestMathValidation(payload: PlayerDynastyIntelligence): Promise<string | null> {
  try {
    const result = await deepseekChat({
      systemPrompt:
        'You are a quantitative fantasy analyst. In 1-2 sentences, validate whether the dynasty math is internally consistent: age curve, market trend, and trajectory. Start with "Valid" or "Concern". No markdown.',
      prompt: `Validate this dynasty intelligence:\n${buildSummary(payload)}`,
      temperature: 0.1,
      maxTokens: 180,
    })
    if (result.error || !result.content?.trim()) return null
    return result.content.trim()
  } catch {
    return null
  }
}

async function requestNarrative(payload: PlayerDynastyIntelligence): Promise<string | null> {
  try {
    const response = await xaiChatJson({
      messages: [
        {
          role: 'system',
          content:
            'You are a dynasty fantasy analyst. Write one short paragraph that frames the player lifecycle, market sentiment, and career arc. Output JSON with key "narrative".',
        },
        {
          role: 'user',
          content: buildSummary(payload),
        },
      ],
      temperature: 0.4,
      maxTokens: 200,
      responseFormat: { type: 'json_object' },
    })
    if (!response.ok || !response.json) return null
    const text = parseTextFromXaiChatCompletion(response.json)
    if (!text) return null
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    try {
      const parsed = JSON.parse(cleaned) as { narrative?: string }
      return parsed.narrative?.trim() ?? null
    } catch {
      return cleaned.slice(0, 320)
    }
  } catch {
    return null
  }
}

async function requestExplanation(payload: PlayerDynastyIntelligence): Promise<string | null> {
  try {
    const response = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are a dynasty fantasy advisor. In 2-3 sentences, explain the best roster action from this valuation snapshot. Be direct and specific. No bullets.',
        },
        {
          role: 'user',
          content: `Dynasty intelligence:\n${buildSummary(payload)}\n\nActionable explanation:`,
        },
      ],
      temperature: 0.4,
      maxTokens: 220,
    })
    if (!response.ok || !response.text?.trim()) return null
    return response.text.trim()
  } catch {
    return null
  }
}

export interface DynastyAIProviderResult {
  provider: 'DeepSeek' | 'Grok' | 'OpenAI'
  label: string
  text: string
  fallback: boolean
}

export interface DynastyAIInsight {
  mathValidation: string | null
  narrative: string | null
  explanation: string | null
  providers: DynastyAIProviderResult[]
}

export async function getDynastyAIInsight(
  payload: PlayerDynastyIntelligence
): Promise<DynastyAIInsight> {
  const [mathValidationRaw, narrativeRaw, explanationRaw] = await Promise.all([
    requestMathValidation(payload),
    requestNarrative(payload),
    requestExplanation(payload),
  ])

  const mathValidation = mathValidationRaw ?? buildFallbackMathValidation(payload)
  const narrative = narrativeRaw ?? buildFallbackNarrative(payload)
  const explanation = explanationRaw ?? buildFallbackExplanation(payload)

  return {
    mathValidation,
    narrative,
    explanation,
    providers: [
      {
        provider: 'DeepSeek',
        label: 'Math validation',
        text: mathValidation,
        fallback: mathValidationRaw == null,
      },
      {
        provider: 'Grok',
        label: 'Narrative',
        text: narrative,
        fallback: narrativeRaw == null,
      },
      {
        provider: 'OpenAI',
        label: 'Final explanation',
        text: explanation,
        fallback: explanationRaw == null,
      },
    ],
  }
}
