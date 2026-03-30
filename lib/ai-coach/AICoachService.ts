/**
 * PROMPT 235 — AI Coach service.
 * Deterministic recommendation is produced first, then AI explanation is layered on top.
 */

import { openaiChatText } from '@/lib/openai-client'
import { getDeterministicRecommendation } from './deterministic-recommenders'
import type {
  AICoachInput,
  AICoachResponse,
  CoachAdviceType,
  CoachExplanation,
  CoachRecommendation,
} from './types'

function sanitizeExplanation(raw: string): {
  summary?: string
  bullets?: string[]
  challenge?: string
  tone?: CoachExplanation['tone']
} {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((item): item is string => typeof item === 'string').slice(0, 4)
      : undefined
    const tone =
      parsed.tone === 'motivational' ||
      parsed.tone === 'cautious' ||
      parsed.tone === 'celebration' ||
      parsed.tone === 'neutral'
        ? parsed.tone
        : undefined
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      bullets,
      challenge: typeof parsed.challenge === 'string' ? parsed.challenge : undefined,
      tone,
    }
  } catch {
    return {}
  }
}

function toDeterministicFallback(recommendation: CoachRecommendation): CoachExplanation {
  const bullets = recommendation.items
    .slice(0, 4)
    .map((item) => `${item.label}${item.detail ? ` — ${item.detail}` : ''}${item.value != null ? ` (${item.value.toFixed(1)})` : ''}`)
  return {
    summary: recommendation.headline,
    bullets,
    challenge: bullets[0] ?? 'Apply the highest-impact recommendation first this week.',
    tone: 'neutral',
    source: 'deterministic',
  }
}

async function buildAIExplanation(
  input: AICoachInput,
  recommendation: CoachRecommendation
): Promise<CoachExplanation> {
  const prompt = {
    role: 'user' as const,
    content: [
      'You are AllFantasy AI Coach.',
      'Deterministic recommendation already computed; explain it clearly for the user.',
      '',
      `Advice type: ${input.type}`,
      `Context: ${recommendation.contextSummary}`,
      `Deterministic headline: ${recommendation.headline}`,
      `Deterministic items: ${recommendation.items.map((item) => `${item.label}${item.value != null ? ` (${item.value})` : ''}`).join(' | ')}`,
      '',
      'Return JSON only:',
      '{',
      '  "summary": "clear recommendation sentence",',
      '  "bullets": ["reason 1", "reason 2", "reason 3"],',
      '  "challenge": "single next action",',
      '  "tone": "motivational|cautious|celebration|neutral"',
      '}',
    ].join('\n'),
  }

  const ai = await openaiChatText({
    messages: [
      {
        role: 'system',
        content:
          'You are a fantasy coach explainer. Never change deterministic recommendation. ' +
          'Only explain why and what to do next. Return valid JSON only.',
      },
      prompt,
    ],
    temperature: 0.4,
    maxTokens: 320,
  })

  if (!ai.ok || !ai.text.trim()) {
    return toDeterministicFallback(recommendation)
  }

  const parsed = sanitizeExplanation(ai.text)
  return {
    summary: parsed.summary ?? recommendation.headline,
    bullets:
      parsed.bullets ??
      recommendation.items.slice(0, 4).map((item) => item.label),
    challenge:
      parsed.challenge ??
      recommendation.items[0]?.label ??
      'Take the first deterministic recommendation this week.',
    tone: parsed.tone ?? 'neutral',
    source: 'ai',
  }
}

export async function getAICoachResponse(input: AICoachInput): Promise<AICoachResponse> {
  const recommendation = await getDeterministicRecommendation(input)
  const explanation = await buildAIExplanation(input, recommendation)
  return {
    type: input.type,
    recommendation,
    explanation,
  }
}

export function normalizeAdviceType(type: string | null | undefined): CoachAdviceType {
  switch ((type ?? '').toLowerCase()) {
    case 'start_sit':
    case 'start-sit':
      return 'start_sit'
    case 'lineup_optimization':
    case 'lineup-optimization':
    case 'lineup':
      return 'lineup_optimization'
    case 'waiver':
      return 'waiver'
    case 'trade':
      return 'trade'
    case 'draft':
      return 'draft'
    default:
      return 'lineup_optimization'
  }
}
