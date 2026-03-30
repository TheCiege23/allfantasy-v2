/**
 * Optional AI enhancement for post-draft manager explanations.
 * Deterministic ranking/scoring stays authoritative; AI only rewrites explanation text.
 */

import { getProviderStatus } from '@/lib/provider-config'
import { openaiChatText } from '@/lib/openai-client'
import type { DraftResultsPayload } from './types'

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const candidate = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!candidate) return null
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number
): Promise<{ ok: true; value: T } | { ok: false }> {
  let timer: NodeJS.Timeout | null = null
  try {
    const timeout = new Promise<{ ok: false }>((resolve) => {
      timer = setTimeout(() => resolve({ ok: false }), timeoutMs)
    })
    const result = await Promise.race([
      work.then((value) => ({ ok: true as const, value })),
      timeout,
    ])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function maybeEnhanceDraftResultsWithAi(
  payload: DraftResultsPayload,
  aiExplain: boolean
): Promise<DraftResultsPayload> {
  if (!aiExplain) {
    return {
      ...payload,
      aiExplanationEnabled: false,
      managerRankings: payload.managerRankings.map((entry) => ({
        ...entry,
        explanationSource: 'deterministic',
      })),
    }
  }
  if (!getProviderStatus().anyAi || payload.managerRankings.length === 0) {
    return {
      ...payload,
      aiExplanationEnabled: false,
      managerRankings: payload.managerRankings.map((entry) => ({
        ...entry,
        explanationSource: 'deterministic',
      })),
    }
  }

  const managerContext = payload.managerRankings.map((entry) => ({
    rosterId: entry.rosterId,
    displayName: entry.displayName,
    rank: entry.rank,
    grade: entry.grade,
    score: entry.score,
    totalValueScore: entry.totalValueScore,
    positionalScore: entry.positionalScore,
    positionalDepthScore: entry.positionalDepthScore,
    benchScore: entry.benchScore,
    balanceScore: entry.balanceScore,
    upsideScore: entry.upsideScore,
    reachPenaltyScore: entry.reachPenaltyScore,
    injuryRiskScore: entry.injuryRiskScore,
    byeWeekScore: entry.byeWeekScore,
  }))

  const aiResponse = await withTimeout(
    openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are a calm fantasy draft analyst. Return STRICT JSON only with key "explanations" whose value is an object of rosterId -> one sentence explanation. Use deterministic metrics provided; do not invent data.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            leagueId: payload.leagueId,
            leagueName: payload.leagueName,
            sport: payload.sport,
            draftType: payload.draftType,
            managers: managerContext,
          }),
        },
      ],
      temperature: 0.4,
      maxTokens: 700,
    }),
    2500
  )

  if (!aiResponse.ok || !aiResponse.value.ok) {
    return {
      ...payload,
      aiExplanationEnabled: false,
      managerRankings: payload.managerRankings.map((entry) => ({
        ...entry,
        explanationSource: 'deterministic',
      })),
    }
  }

  const parsed = extractJsonObject(aiResponse.value.text)
  const explanationsRaw =
    parsed && typeof parsed.explanations === 'object' && parsed.explanations && !Array.isArray(parsed.explanations)
      ? (parsed.explanations as Record<string, unknown>)
      : null

  if (!explanationsRaw) {
    return {
      ...payload,
      aiExplanationEnabled: false,
      managerRankings: payload.managerRankings.map((entry) => ({
        ...entry,
        explanationSource: 'deterministic',
      })),
    }
  }

  const managerRankings = payload.managerRankings.map((entry) => {
    const aiExplanation = explanationsRaw[entry.rosterId]
    if (typeof aiExplanation !== 'string' || !aiExplanation.trim()) {
      return { ...entry, explanationSource: 'deterministic' as const }
    }
    return {
      ...entry,
      explanation: aiExplanation.trim(),
      explanationSource: 'ai' as const,
    }
  })

  const aiCount = managerRankings.filter((entry) => entry.explanationSource === 'ai').length
  return {
    ...payload,
    aiExplanationEnabled: aiCount > 0,
    managerRankings,
  }
}

