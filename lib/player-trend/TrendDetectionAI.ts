/**
 * PROMPT 135 – AI layer for player trend detection.
 * DeepSeek: trend math validation.
 * Grok: hype detection (narrative vs numbers).
 * OpenAI: actionable explanation.
 */
import { deepseekChat } from '@/lib/deepseek-client'
import { xaiChatJson, parseTextFromXaiChatCompletion } from '@/lib/xai-client'
import { openaiChatText } from '@/lib/openai-client'
import type { TrendFeedItem } from './TrendDetectionService'

export interface TrendAIInsight {
  /** DeepSeek: whether trend math is consistent and thresholds reasonable */
  mathValidation: string | null
  /** Grok: hype vs numbers (e.g. narrative_driven, numbers_backed) */
  hypeDetection: string | null
  /** OpenAI: one-sentence actionable recommendation */
  actionableExplanation: string | null
}

function buildPayloadSummary(item: TrendFeedItem): string {
  const s = item.signals
  const delta =
    s.performanceDelta != null ? s.performanceDelta.toFixed(2) : 'N/A'
  return [
    `Player: ${item.displayName ?? item.playerId}`,
    `Sport: ${item.sport}`,
    `Trend type: ${item.trendType}`,
    `Direction: ${item.direction}`,
    `Trend score: ${item.trendScore.toFixed(2)}`,
    `Performance delta: ${delta}`,
    `Usage change (add-drop): ${s.usageChange.toFixed(2)}`,
    `Minutes/snap share (lineup rate): ${s.minutesOrSnapShare.toFixed(2)}`,
    `Efficiency score: ${s.efficiencyScore.toFixed(2)}`,
  ].join('\n')
}

/**
 * DeepSeek: validate trend math (score delta, thresholds, consistency).
 */
export async function validateTrendMath(item: TrendFeedItem): Promise<string | null> {
  const summary = buildPayloadSummary(item)
  const result = await deepseekChat({
    systemPrompt:
      'You are a quantitative fantasy sports analyst. In 1–2 sentences, validate whether the trend numbers are internally consistent (e.g. performance delta matches score change, usage and lineup rate are plausible). Say "Valid" or note any inconsistency. No markdown.',
    prompt: `Validate this trend record:\n${summary}`,
    temperature: 0.1,
    maxTokens: 200,
  })
  if (result.error || !result.content?.trim()) return null
  return result.content.trim()
}

/**
 * Grok: hype detection – is buzz narrative-driven or backed by numbers?
 */
export async function detectTrendHype(item: TrendFeedItem): Promise<string | null> {
  const summary = buildPayloadSummary(item)
  const res = await xaiChatJson({
    messages: [
      {
        role: 'system',
        content:
          'You are a fantasy sports analyst. Assess whether the trend buzz is hype (narrative-driven) or backed by the numbers. Return only a JSON object with keys: hypeLevel (one of "narrative_driven", "numbers_backed", "mixed"), summary (one short sentence).',
      },
      {
        role: 'user',
        content: `Assess hype vs numbers for this trend:\n${summary}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 150,
    responseFormat: { type: 'json_object' },
  })
  if (!res.ok || !res.json) return null
  const text = parseTextFromXaiChatCompletion(res.json)
  if (!text) return null
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const obj = JSON.parse(cleaned) as { hypeLevel?: string; summary?: string }
    return [obj.hypeLevel, obj.summary].filter(Boolean).join(': ') || null
  } catch {
    return text.slice(0, 200)
  }
}

/**
 * OpenAI: short actionable explanation for the manager.
 */
export async function getActionableExplanation(item: TrendFeedItem): Promise<string | null> {
  const summary = buildPayloadSummary(item)
  const res = await openaiChatText({
    messages: [
      {
        role: 'system',
        content:
          'You are a fantasy sports assistant. In exactly one short sentence, give an actionable recommendation (e.g. "Consider selling high while trade interest is up" or "Monitor usage; breakout may continue"). No bullet points, no markdown.',
      },
      {
        role: 'user',
        content: `Trend:\n${summary}\n\nOne-sentence actionable recommendation:`,
      },
    ],
    temperature: 0.4,
    maxTokens: 120,
  })
  if (!res.ok || !res.text?.trim()) return null
  return res.text.trim()
}

/**
 * Run all three AI layers for one trend item. Runs in parallel; missing keys return null.
 */
export async function getTrendAIInsight(item: TrendFeedItem): Promise<TrendAIInsight> {
  const [mathValidation, hypeDetection, actionableExplanation] = await Promise.all([
    validateTrendMath(item),
    detectTrendHype(item),
    getActionableExplanation(item),
  ])
  return {
    mathValidation: mathValidation ?? null,
    hypeDetection: hypeDetection ?? null,
    actionableExplanation: actionableExplanation ?? null,
  }
}
