/**
 * PROMPT 135 - AI layer for player trend detection.
 * DeepSeek: trend math validation.
 * Grok: hype detection (narrative vs numbers).
 * OpenAI: actionable explanation.
 */
import { deepseekChat } from '@/lib/deepseek-client'
import { openaiChatText } from '@/lib/openai-client'
import { xaiChatJson, parseTextFromXaiChatCompletion } from '@/lib/xai-client'
import type { TrendAIInsight } from './types'
import type { TrendFeedItem } from './TrendDetectionService'

export type { TrendAIInsight }

function formatMaybe(value: number | null | undefined, digits: number = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/A'
}

function buildPayloadSummary(item: TrendFeedItem): string {
  const s = item.signals
  const snapshot = item.snapshot
  return [
    `Player: ${item.displayName ?? item.playerId}`,
    `Sport: ${item.sport}`,
    `Position: ${item.position ?? 'N/A'}`,
    `Team: ${item.team ?? 'N/A'}`,
    `Trend type: ${item.trendType}`,
    `Direction: ${item.direction}`,
    `Trend score: ${item.trendScore.toFixed(2)}`,
    `Performance delta: ${formatMaybe(s.performanceDelta)}`,
    `Usage change: ${s.usageChange.toFixed(3)}`,
    `Minutes/snap share: ${s.minutesOrSnapShare.toFixed(3)}`,
    `Efficiency score: ${s.efficiencyScore.toFixed(2)}`,
    `Signal strength: ${s.signalStrength.toFixed(1)}`,
    `Confidence: ${s.confidence.toFixed(2)}`,
    `Recent fantasy avg: ${formatMaybe(snapshot.recentFantasyPointsAvg)}`,
    `Prior fantasy avg: ${formatMaybe(snapshot.priorFantasyPointsAvg)}`,
    `Recent usage avg: ${formatMaybe(snapshot.recentUsageValue, 3)}`,
    `Prior usage avg: ${formatMaybe(snapshot.priorUsageValue, 3)}`,
    `Expected fantasy avg: ${formatMaybe(snapshot.expectedFantasyPointsPerGame)}`,
    `Expected gap: ${formatMaybe(snapshot.expectedGap)}`,
    `Recent sample: ${snapshot.recentGamesSample}`,
    `Prior sample: ${snapshot.priorGamesSample}`,
    `Deterministic headline: ${item.summary.headline}`,
    `Deterministic rationale: ${item.summary.rationale}`,
    `Deterministic recommendation: ${item.summary.recommendation}`,
  ].join('\n')
}

function buildFallbackMathValidation(item: TrendFeedItem): string {
  const performanceDelta = item.signals.performanceDelta
  const directionMatchesDelta =
    performanceDelta == null ||
    (performanceDelta >= 0 && (item.direction === 'Hot' || item.direction === 'Rising')) ||
    (performanceDelta <= 0 && (item.direction === 'Cold' || item.direction === 'Falling'))
  if (directionMatchesDelta) {
    return `Valid: the recent production, usage, and share profile is consistent with a ${item.trendType.replace(/_/g, ' ')} label.`
  }
  return `Mostly valid, but the recent fantasy delta is softer than the underlying ${item.direction.toLowerCase()} direction suggests.`
}

function buildFallbackHypeDetection(item: TrendFeedItem): string {
  const expectedGap = item.snapshot.expectedGap ?? 0
  if (item.signals.signalStrength >= 65 && expectedGap >= 1.5) {
    return 'numbers_backed: the recent production jump is supported by opportunity growth and a healthy expected-value gap.'
  }
  if (item.trendType === 'sell_high_candidate' || item.signals.signalStrength < 45) {
    return 'mixed: the market is reacting, but the opportunity base is not climbing as quickly as the story.'
  }
  return 'narrative_driven: there is some buzz here, but the underlying role still needs another week of confirmation.'
}

function buildFallbackActionableExplanation(item: TrendFeedItem): string {
  if (item.trendType === 'sell_high_candidate') {
    return `Consider floating ${item.displayName ?? item.playerId} in trade talks before the market cools off.`
  }
  if (item.trendType === 'breakout_candidate') {
    return `Prioritize ${item.displayName ?? item.playerId} in lineups or waivers before the workload fully catches up to the trend.`
  }
  if (item.trendType === 'cold_streak') {
    return `Treat ${item.displayName ?? item.playerId} as a cautious start until the role and efficiency recover.`
  }
  return `Ride the momentum with ${item.displayName ?? item.playerId} while the opportunity and efficiency are still aligned.`
}

/**
 * DeepSeek: validate trend math (score delta, thresholds, consistency).
 */
export async function validateTrendMath(item: TrendFeedItem): Promise<string | null> {
  const summary = buildPayloadSummary(item)
  const result = await deepseekChat({
    systemPrompt:
      'You are a quantitative fantasy sports analyst. In 1-2 sentences, validate whether the trend numbers are internally consistent. Explicitly mention if the recent vs prior production, usage, and role share support the trend label. No markdown.',
    prompt: `Validate this trend record:\n${summary}`,
    temperature: 0.1,
    maxTokens: 220,
  })
  if (result.error || !result.content?.trim()) return null
  return result.content.trim()
}

/**
 * Grok: hype detection - is buzz narrative-driven or backed by numbers?
 */
export async function detectTrendHype(item: TrendFeedItem): Promise<string | null> {
  const summary = buildPayloadSummary(item)
  const res = await xaiChatJson({
    messages: [
      {
        role: 'system',
        content:
          'You are a fantasy sports analyst. Assess whether the trend buzz is hype or backed by the numbers. Return only a JSON object with keys: hypeLevel (one of "narrative_driven", "numbers_backed", "mixed"), summary (one short sentence).',
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
          'You are a fantasy sports assistant. In exactly one short sentence, give an actionable recommendation tied to the recent production, opportunity change, and risk profile. No bullet points and no markdown.',
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
 * Run all three AI layers for one trend item. Runs in parallel; deterministic fallbacks fill gaps.
 */
export async function getTrendAIInsight(item: TrendFeedItem): Promise<TrendAIInsight> {
  const [mathValidation, hypeDetection, actionableExplanation] = await Promise.all([
    validateTrendMath(item),
    detectTrendHype(item),
    getActionableExplanation(item),
  ])
  return {
    mathValidation: mathValidation ?? buildFallbackMathValidation(item),
    hypeDetection: hypeDetection ?? buildFallbackHypeDetection(item),
    actionableExplanation: actionableExplanation ?? buildFallbackActionableExplanation(item),
  }
}
