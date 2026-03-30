/**
 * POST /api/ai/chimmy — Chimmy chat via unified orchestration (tool=chimmy_chat).
 * Same request contract; tool is chimmy_chat. For dedicated Chimmy UI use /api/chat/chimmy (form/messages).
 * This route allows run/compare/retry/open-in-Chimmy flows with the same contract.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration'
import {
  validateToolRequest,
  requestContractToUnified,
  unifiedResponseToContract,
  type AIToolResponseContract,
} from '@/lib/ai-tool-registry'
import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import { getChimmyMemoryContext } from '@/lib/ai-memory/chimmy-memory-context'
import { appendChatHistory, buildChimmyConversationId } from '@/lib/ai-memory/chat-history-store'
import { rememberChimmyAssistantMemory, rememberChimmyUserMessageMemory } from '@/lib/ai-memory/ai-memory-store'

function extractSportsContextMeta(envelope: AIContextEnvelope): {
  source?: string
  state?: 'live' | 'cached' | 'stale' | 'missing'
  available: boolean
  keys: string[]
  missingCount: number
  attemptedSources: string[]
} {
  const stats = envelope.statisticsPayload && typeof envelope.statisticsPayload === 'object'
    ? (envelope.statisticsPayload as Record<string, unknown>)
    : null
  const sportsData = stats?.sportsData && typeof stats.sportsData === 'object'
    ? (stats.sportsData as Record<string, unknown>)
    : null
  const coverage = stats?.sportsDataCoverage && typeof stats.sportsDataCoverage === 'object'
    ? (stats.sportsDataCoverage as Record<string, unknown>)
    : null
  const missing = Array.isArray(coverage?.missing)
    ? coverage?.missing.filter((item): item is string => typeof item === 'string')
    : []
  const attemptedSources = Array.isArray(stats?.sportsDataAttemptedSources)
    ? stats?.sportsDataAttemptedSources.filter((item): item is string => typeof item === 'string')
    : []
  const rawState = typeof stats?.sportsDataState === 'string' ? stats.sportsDataState : undefined
  const state: 'live' | 'cached' | 'stale' | 'missing' =
    rawState === 'live' || rawState === 'cached' || rawState === 'stale'
      ? rawState
      : sportsData
        ? 'live'
        : 'missing'
  return {
    source: typeof stats?.sportsDataSource === 'string' ? stats.sportsDataSource : undefined,
    state,
    available: Boolean(sportsData && Object.keys(sportsData).length > 0),
    keys: sportsData ? Object.keys(sportsData) : [],
    missingCount: missing.length,
    attemptedSources,
  }
}

function attachSportsDebugTrace(
  responseContract: AIToolResponseContract,
  envelope: AIContextEnvelope
): AIToolResponseContract {
  const providerUsed = responseContract.providerResults.find((provider) => !provider.skipped && !provider.error)?.provider
  const sportsMeta = extractSportsContextMeta(envelope)
  return {
    ...responseContract,
    uncertainty:
      responseContract.uncertainty ??
      (sportsMeta.missingCount > 0 ? `Some sports context is unavailable (${sportsMeta.missingCount} missing item(s)).` : null),
    debugTrace: {
      ...(responseContract.debugTrace ?? {}),
      traceId: responseContract.traceId ?? null,
      providerUsed,
      sportsDataSource: sportsMeta.source,
      sportsDataState: sportsMeta.state,
      sportsDataAvailable: sportsMeta.available,
      sportsDataKeys: sportsMeta.keys,
      sportsDataMissingCount: sportsMeta.missingCount,
      sportsDataAttemptedSources: sportsMeta.attemptedSources,
    },
  }
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'unauthorized', message: 'Unauthorized', userMessage: 'You need to sign in to use this feature.' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    const b = await req.json()
    body = typeof b === 'object' && b != null ? (b as Record<string, unknown>) : {}
  } catch {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'Invalid JSON',
        userMessage: 'Invalid request. Check that the body is valid JSON.',
      },
      { status: 400 }
    )
  }

  const contract = {
    ...body,
    tool: (body.tool as string) || 'chimmy_chat',
    sport: (body.sport as string) || 'NFL',
    userMessage: (typeof body.userMessage === 'string' ? body.userMessage : typeof body.message === 'string' ? body.message : '') as string,
    userId: session.user.id,
  }
  const leagueId = typeof contract.leagueId === 'string' ? contract.leagueId : null
  const conversationId = buildChimmyConversationId({
    userId: session.user.id,
    leagueId,
    explicitConversationId:
      typeof (body as { conversationId?: unknown }).conversationId === 'string'
        ? (body as { conversationId: string }).conversationId
        : null,
  })
  const validation = validateToolRequest(
    contract.tool,
    (contract as { deterministicContext?: Record<string, unknown> }).deterministicContext ?? undefined,
    {
      leagueSettings:
        (contract as { leagueSettings?: Record<string, unknown> | null }).leagueSettings ?? null,
      sport: (contract as { sport?: string | null }).sport ?? null,
    }
  )
  if (!validation.valid) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: validation.error,
        userMessage: validation.error ?? 'Invalid Chimmy request.',
      },
      { status: 400 }
    )
  }

  const memorySection =
    contract.userMessage.trim().length > 0
      ? await getChimmyMemoryContext({
          userId: session.user.id,
          leagueId,
          conversationId,
        })
          .then((ctx) => ctx.promptSection || '')
          .catch(() => '')
      : ''

  const enrichedContract = {
    ...contract,
    userMessage:
      memorySection.trim().length > 0
        ? `${contract.userMessage}\n\n---\n\nMEMORY CONTEXT:\n${memorySection}`
        : contract.userMessage,
  }

  const unified = requestContractToUnified(enrichedContract, session.user.id)
  if (!unified.envelope.userMessage && !unified.envelope.deterministicPayload) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'userMessage or message is required for Chimmy.',
        userMessage: 'Send a message to Chimmy.',
      },
      { status: 400 }
    )
  }

  const result = await runUnifiedOrchestration(unified)
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.error.code,
        message: result.error.message,
        userMessage: result.error.userMessage,
        provider: result.error.provider,
        traceId: result.error.traceId,
      },
      { status: result.status }
    )
  }

  const responseContract = unifiedResponseToContract(result.response)
  const responseWithTrace = attachSportsDebugTrace(responseContract, unified.envelope)

  const persistTasks = [
    appendChatHistory({
      conversationId,
      role: 'user',
      content: contract.userMessage,
      userId: session.user.id,
      leagueId,
    }),
    appendChatHistory({
      conversationId,
      role: 'assistant',
      content: responseContract.aiExplanation,
      userId: session.user.id,
      leagueId,
      meta: {
        confidence: responseContract.confidence ?? null,
      },
    }),
    rememberChimmyUserMessageMemory({
      userId: session.user.id,
      leagueId,
      sport: contract.sport,
      message: contract.userMessage,
    }),
    rememberChimmyAssistantMemory({
      userId: session.user.id,
      leagueId,
      answer: responseContract.aiExplanation,
      confidence: responseContract.confidence ?? null,
    }),
  ]
  await Promise.allSettled(persistTasks)

  return NextResponse.json({
    ...responseWithTrace,
    debugTrace: {
      ...(responseWithTrace.debugTrace ?? {}),
      conversationId,
    },
  })
}
