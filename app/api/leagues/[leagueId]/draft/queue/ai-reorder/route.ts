/**
 * POST: AI reorder draft queue by roster need and availability.
 * Body: { queue?: QueueEntry[] } (default: load from DB).
 * Returns: { reordered: QueueEntry[], explanation: string }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'
import {
  dedupeQueueEntries,
  normalizeDraftedNameSet,
  normalizeQueueEntries,
  removeDraftedPlayersFromQueue,
  reorderQueueByNeed,
} from '@/lib/draft-queue-engine'
import type { QueueEntry } from '@/lib/live-draft-engine/types'
import { normalizeDraftQueueSizeLimit } from '@/lib/draft-defaults/DraftQueueLimitResolver'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getProviderStatus } from '@/lib/provider-config'
import { openaiChatText } from '@/lib/openai-client'
import {
  buildDraftExecutionMetadata,
  evaluateAIInvocationPolicy,
  withTimeout,
} from '@/lib/draft-automation-policy'
import {
  API_CACHE_TTL,
  getApiCached,
  setApiCached,
} from '@/lib/api-performance'

export const dynamic = 'force-dynamic'
const DRAFT_QUEUE_AI_EXPLANATION_CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=120'

function hashString(input: string): string {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24)
  }
  return (hash >>> 0).toString(16)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  const wantsAiExplanation = Boolean(body.aiExplanation ?? body.ai_explanation ?? false)
  let queue: QueueEntry[] = Array.isArray(body.queue) ? body.queue : []

  if (queue.length === 0) {
    const draftSession = await prisma.draftSession.findUnique({
      where: { leagueId },
      select: { id: true },
    })
    if (draftSession) {
      const row = await prisma.draftQueue.findUnique({
        where: { sessionId_userId: { sessionId: draftSession.id, userId } },
      })
      const order = (row?.order as unknown as QueueEntry[]) ?? []
      queue = order.filter(Boolean)
    }
  }

  const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!draftSession) {
    return NextResponse.json({ error: 'No draft session' }, { status: 404 })
  }
  const { getDraftConfigForLeague } = await import('@/lib/draft-defaults/DraftRoomConfigResolver')
  const draftConfig = await getDraftConfigForLeague(leagueId)
  const queueSizeLimit = normalizeDraftQueueSizeLimit(draftConfig?.queue_size_limit)
  const normalizedQueue = dedupeQueueEntries(normalizeQueueEntries(queue, queueSizeLimit))
  const draftedNames = normalizeDraftedNameSet(draftSession.picks)
  const cleanedQueue = removeDraftedPlayersFromQueue(normalizedQueue, draftedNames)
  queue = cleanedQueue.queue
  if (queue.length < 2) {
    return NextResponse.json({
      reordered: queue,
      explanation: cleanedQueue.removedCount > 0
        ? `Queue has fewer than 2 available players after removing ${cleanedQueue.removedCount} unavailable player${cleanedQueue.removedCount === 1 ? '' : 's'}.`
        : 'Queue has fewer than 2 players; no reorder needed.',
      removedUnavailable: cleanedQueue.removedCount,
    })
  }

  const rosterPositions: string[] = []
  if (draftSession.picks && (currentUserRosterId || userId)) {
    for (const p of draftSession.picks) {
      if (p.rosterId === currentUserRosterId) {
        rosterPositions.push(p.position ?? '')
      }
    }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport = (league?.sport as string) ?? 'NFL'

  const result = reorderQueueByNeed({
    queue,
    rosterPositions,
    sport,
  })

  let explanation = result.explanation
  let aiUsed = false
  let reasonCode = 'deterministic_rules_engine'
  const invocation = evaluateAIInvocationPolicy({
    feature: 'explain_ai_queue_reorder_rationale',
    scopeId: leagueId,
    requestAI: wantsAiExplanation,
    aiEnabled: uiSettings.aiQueueReorderEnabled,
    providerAvailable: getProviderStatus().anyAi,
  })

  if (invocation.decision === 'allow_ai') {
    const lead = result.reordered.slice(0, 4).map((entry) => `${entry.playerName} (${entry.position})`)
    const needEntries = Object.entries(result.needByPosition ?? {}) as Array<[string, number]>
    const needContext = needEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([position, score]) => `${position}:${score}`)
      .join(', ')
    const aiExplanationCacheKey = `draft_queue_ai_explanation:${leagueId}:${hashString(
      JSON.stringify({ sport, lead, needContext, deterministic: result.explanation })
    )}`
    const cachedExplanation = getApiCached(aiExplanationCacheKey)
    if (
      cachedExplanation &&
      cachedExplanation.body &&
      typeof (cachedExplanation.body as { explanation?: unknown }).explanation === 'string'
    ) {
      explanation = String((cachedExplanation.body as { explanation?: string }).explanation)
      aiUsed = true
      reasonCode = 'ai_explanation_cache_hit'
    } else {
      const aiResult = await withTimeout(
        openaiChatText({
          messages: [
            {
              role: 'system',
              content:
                'You explain fantasy draft queue reorder outcomes. Keep response to one concise sentence. Never invent players or scores.',
            },
            {
              role: 'user',
              content: [
                `Sport: ${sport}`,
                `Top queue after deterministic reorder: ${lead.join(', ') || 'none'}`,
                `Need scores: ${needContext || 'not available'}`,
                `Deterministic explanation: ${result.explanation}`,
                'Rewrite this as a clear coach-style explanation while preserving the same facts.',
              ].join('\n'),
            },
          ],
          temperature: 0.3,
          maxTokens: 120,
        }),
        invocation.maxLatencyMs
      )

      if (aiResult.ok && aiResult.value.ok && aiResult.value.text.trim().length > 0) {
        explanation = aiResult.value.text.trim()
        aiUsed = true
        reasonCode = 'ai_explanation_applied'
        setApiCached(
          aiExplanationCacheKey,
          { explanation },
          {
            ttlMs: API_CACHE_TTL.MEDIUM,
            status: 200,
            headers: { 'Cache-Control': DRAFT_QUEUE_AI_EXPLANATION_CACHE_CONTROL },
          }
        )
      } else if (!aiResult.ok) {
        reasonCode = 'ai_timeout_deterministic_fallback'
      } else {
        reasonCode = 'ai_unavailable_deterministic_fallback'
      }
    }
  } else {
    reasonCode = invocation.reasonCode
  }

  return NextResponse.json({
    reordered: result.reordered,
    explanation,
    removedUnavailable: cleanedQueue.removedCount,
    execution: buildDraftExecutionMetadata({
      feature: 'draft_queue_reorder_engine',
      aiUsed,
      aiEligible: invocation.canShowAIButton,
      reasonCode,
      fallbackToDeterministic: wantsAiExplanation && !aiUsed && invocation.decision !== 'deny_dead_button',
    }),
    ai: {
      explanationRequested: wantsAiExplanation,
      explanationEnabled: uiSettings.aiQueueReorderEnabled,
      decision: invocation.decision,
      reasonCode: invocation.reasonCode,
    },
  })
}
