import { runCostControlledOpenAIText } from '@/lib/ai-cost-control'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export interface DeterministicExplanationInput {
  feature: string
  sport?: string | null
  deterministicSummary: string
  deterministicEvidence?: string[]
  instruction?: string
  maxTokens?: number
  temperature?: number
  maxChars?: number
  deterministicFallbackText?: string | null
  strictNumericGrounding?: boolean
  cacheTtlMs?: number
  repeatCooldownMs?: number
}

export interface DeterministicExplanationResult {
  source: 'ai' | 'deterministic'
  text: string | null
  reason:
    | 'ai_success'
    | 'ai_unavailable'
    | 'ai_empty'
    | 'ai_not_grounded'
    | 'invalid_input'
}

function cleanText(raw: string): string {
  return raw
    .replace(/^```[\w-]*\s*/i, '')
    .replace(/```$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractNumericTokens(text: string): Set<string> {
  const matches = text.match(/-?\d+(?:\.\d+)?%?/g) ?? []
  return new Set(matches.map((token) => token.trim()).filter(Boolean))
}

function isNumericallyGrounded(args: {
  candidate: string
  deterministicSummary: string
  deterministicEvidence: string[]
}): boolean {
  const allowed = new Set<string>()
  for (const token of extractNumericTokens(args.deterministicSummary)) allowed.add(token)
  for (const line of args.deterministicEvidence) {
    for (const token of extractNumericTokens(line)) allowed.add(token)
  }

  const candidateTokens = extractNumericTokens(args.candidate)
  if (candidateTokens.size === 0) return true
  if (allowed.size === 0) return false

  for (const token of candidateTokens) {
    if (!allowed.has(token)) return false
  }
  return true
}

/**
 * PROMPT 246 — AI Explanation Layer:
 * Explain deterministic outputs without overriding the underlying math.
 */
export async function explainDeterministicOutput(
  input: DeterministicExplanationInput
): Promise<DeterministicExplanationResult> {
  const summary = input.deterministicSummary?.trim()
  if (!summary) {
    return {
      source: 'deterministic',
      text: input.deterministicFallbackText ?? null,
      reason: 'invalid_input',
    }
  }

  const sport = normalizeToSupportedSport(input.sport)
  const deterministicEvidence = (input.deterministicEvidence ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)

  const ai = await runCostControlledOpenAIText({
    feature: `explanation:${input.feature}`,
    enableAI: true,
    fallbackText: input.deterministicFallbackText ?? null,
    cacheTtlMs: input.cacheTtlMs ?? 5 * 60 * 1000,
    repeatCooldownMs: input.repeatCooldownMs ?? 12 * 1000,
    cacheContext: {
      sport,
      feature: input.feature,
      deterministicSummary: summary,
      deterministicEvidence,
      instruction: input.instruction ?? null,
    },
    messages: [
      {
        role: 'system',
        content: [
          'You are the AllFantasy AI Explanation Layer.',
          'You explain deterministic outputs only.',
          'Do not override, modify, or contradict deterministic math or rankings.',
          'Do not introduce new numbers unless they already exist in deterministic inputs.',
          'If evidence is limited, explicitly say confidence is constrained by deterministic inputs.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `Feature: ${input.feature}`,
          `Sport: ${sport}`,
          `Deterministic summary: ${summary}`,
          deterministicEvidence.length > 0 ? `Deterministic evidence:\n- ${deterministicEvidence.join('\n- ')}` : '',
          input.instruction ??
            'Write 2 concise sentences explaining why the deterministic output makes sense and one practical next step.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    temperature: input.temperature ?? 0.25,
    maxTokens: input.maxTokens ?? 220,
  })

  if (!ai.ok) {
    return {
      source: 'deterministic',
      text: input.deterministicFallbackText ?? null,
      reason: 'ai_unavailable',
    }
  }

  if (!ai.text) {
    return {
      source: 'deterministic',
      text: input.deterministicFallbackText ?? null,
      reason: 'ai_empty',
    }
  }

  const cleaned = cleanText(ai.text)
  if (!cleaned) {
    return {
      source: 'deterministic',
      text: input.deterministicFallbackText ?? null,
      reason: 'ai_empty',
    }
  }

  const bounded = cleaned.slice(0, input.maxChars ?? 520)
  const strictNumericGrounding = input.strictNumericGrounding ?? true
  if (
    strictNumericGrounding &&
    !isNumericallyGrounded({
      candidate: bounded,
      deterministicSummary: summary,
      deterministicEvidence,
    })
  ) {
    return {
      source: 'deterministic',
      text: input.deterministicFallbackText ?? null,
      reason: 'ai_not_grounded',
    }
  }

  return {
    source: 'ai',
    text: bounded,
    reason: 'ai_success',
  }
}
