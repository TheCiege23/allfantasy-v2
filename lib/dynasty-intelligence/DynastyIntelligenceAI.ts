/**
 * Dynasty Intelligence AI (PROMPT 137).
 * DeepSeek: math validation.
 * Grok: narrative.
 * OpenAI: final explanation.
 */
import { deepseekChat } from '@/lib/deepseek-client'
import { xaiChatJson, parseTextFromXaiChatCompletion } from '@/lib/xai-client'
import { openaiChatText } from '@/lib/openai-client'
import type { PlayerDynastyIntelligence } from './types'

function buildSummary(payload: PlayerDynastyIntelligence): string {
  const lines: string[] = [
    `Sport: ${payload.sport}`,
    `Position: ${payload.position}`,
    `Age: ${payload.age ?? 'unknown'}`,
    `Current value: ${payload.currentValue}`,
    `Expected window: ${payload.careerTrajectory?.expectedWindowYears ?? 'N/A'} years`,
  ]
  if (payload.ageCurve.points.length) {
    const peak = payload.ageCurve.points.filter((p) => p.label?.includes('Peak'))
    if (peak.length) lines.push(`Peak age range: ${payload.ageCurve.peakAgeStart}-${payload.ageCurve.peakAgeEnd}`)
  }
  if (payload.marketValueTrend) {
    lines.push(
      `Market trend: ${payload.marketValueTrend.direction}, score ${payload.marketValueTrend.trendScore.toFixed(1)}, delta ${payload.marketValueTrend.scoreDelta ?? 'N/A'}`
    )
  }
  if (payload.careerTrajectory?.points.length) {
    const pts = payload.careerTrajectory.points
    lines.push(
      `Trajectory: Y0=${pts[0]?.projectedValue ?? 0}, Y3=${pts.find((p) => p.yearOffset === 3)?.projectedValue ?? 0}, Y5=${pts.find((p) => p.yearOffset === 5)?.projectedValue ?? 0}`
    )
  }
  return lines.join('\n')
}

/**
 * DeepSeek: validate dynasty math (age curve consistency, trajectory formula).
 */
export async function validateDynastyMath(
  payload: PlayerDynastyIntelligence
): Promise<string | null> {
  const summary = buildSummary(payload)
  const result = await deepseekChat({
    systemPrompt:
      'You are a quantitative fantasy sports analyst. In 1–2 sentences, validate whether the dynasty numbers are consistent: age curve multiplier vs trajectory projections, window years vs position. Say "Valid" or note any inconsistency. No markdown.',
    prompt: `Validate this dynasty intelligence:\n${summary}`,
    temperature: 0.1,
    maxTokens: 200,
  })
  if (result.error || !result.content?.trim()) return null
  return result.content.trim()
}

/**
 * Grok: narrative framing (story of the curve/trajectory).
 */
export async function getDynastyNarrative(
  payload: PlayerDynastyIntelligence
): Promise<string | null> {
  const summary = buildSummary(payload)
  const res = await xaiChatJson({
    messages: [
      {
        role: 'system',
        content:
          'You are a dynasty fantasy analyst. In one short paragraph, tell the story of this player or profile: age curve, window, and trajectory. No numbers in the narrative—use phrases like "peak window", "cliff risk", "long runway". Output only a JSON object with key "narrative" (string).',
      },
      { role: 'user', content: summary },
    ],
    temperature: 0.4,
    maxTokens: 200,
    responseFormat: { type: 'json_object' },
  })
  if (!res.ok || !res.json) return null
  const text = parseTextFromXaiChatCompletion(res.json)
  if (!text) return null
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const obj = JSON.parse(cleaned) as { narrative?: string }
    return obj.narrative ?? null
  } catch {
    return text.slice(0, 300)
  }
}

/**
 * OpenAI: final actionable explanation for the manager.
 */
export async function getDynastyExplanation(
  payload: PlayerDynastyIntelligence
): Promise<string | null> {
  const summary = buildSummary(payload)
  const res = await openaiChatText({
    messages: [
      {
        role: 'system',
        content:
          'You are a dynasty fantasy advisor. In 2–3 sentences, give an actionable take: what the age curve and trajectory mean for trade/roster decisions. Be specific (e.g. "sell before cliff", "peak window ahead"). No bullet points, no markdown.',
      },
      {
        role: 'user',
        content: `Dynasty intelligence:\n${summary}\n\nActionable explanation:`,
      },
    ],
    temperature: 0.4,
    maxTokens: 250,
  })
  if (!res.ok || !res.text?.trim()) return null
  return res.text.trim()
}

export interface DynastyAIInsight {
  mathValidation: string | null
  narrative: string | null
  explanation: string | null
}

/**
 * Run all three AI layers for a dynasty intelligence payload.
 */
export async function getDynastyAIInsight(
  payload: PlayerDynastyIntelligence
): Promise<DynastyAIInsight> {
  const [mathValidation, narrative, explanation] = await Promise.all([
    validateDynastyMath(payload),
    getDynastyNarrative(payload),
    getDynastyExplanation(payload),
  ])
  return {
    mathValidation: mathValidation ?? null,
    narrative: narrative ?? null,
    explanation: explanation ?? null,
  }
}
