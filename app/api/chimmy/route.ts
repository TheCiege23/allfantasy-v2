/**
 * Canonical Chimmy route alias.
 * Accepts the legacy JSON contract and maps it into the dedicated Chimmy handler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { POST as postChatChimmy } from '@/app/api/chat/chimmy/route'
import { runAgentPipeline, isAnthropicPipelineAvailable, type UserContext } from '@/lib/agents/anthropic-pipeline'
import { runAiProtection } from '@/lib/ai-protection'
import { authOptions } from '@/lib/auth'
import { isAnthropicChimmyEnabled } from '@/lib/feature-toggle'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { TokenSpendService } from '@/lib/tokens/TokenSpendService'

const MAX_MESSAGE_CHARS = 4_000
const MAX_CONVERSATION_TURNS = 20
const MAX_CONVERSATION_CONTENT_CHARS = 4_000

const ConversationTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_CONVERSATION_CONTENT_CHARS),
})

const ChimmyImageSchema = z.object({
  dataUrl: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  type: z.string().trim().min(1).max(120).optional(),
})

const ChimmyJsonRequestSchema = z.object({
  message: z.string().trim().max(MAX_MESSAGE_CHARS).default(''),
  confirmTokenSpend: z.boolean().optional(),
  conversation: z.array(ConversationTurnSchema).max(MAX_CONVERSATION_TURNS).optional(),
  image: ChimmyImageSchema.optional(),
  userContext: z.object({
    userId: z.string().trim().min(1).optional(),
    tier: z.enum(['free', 'pro']).optional(),
    sport: z.string().trim().min(1).max(32).optional(),
    leagueId: z.string().trim().min(1).max(120).optional(),
    sleeperUsername: z.string().trim().min(1).max(80).optional(),
    insightType: z.enum(['matchup', 'playoff', 'dynasty', 'trade', 'waiver', 'draft']).optional(),
    teamId: z.string().trim().min(1).max(120).optional(),
    season: z.number().int().min(1900).max(3000).optional(),
    week: z.number().int().min(1).max(100).optional(),
    conversationId: z.string().trim().min(1).max(120).optional(),
    privateMode: z.boolean().optional(),
    targetUsername: z.string().trim().min(1).max(80).optional(),
    strategyMode: z.string().trim().min(1).max(48).optional(),
    source: z.string().trim().min(1).max(64).optional(),
    leagueFormat: z.string().trim().min(1).max(48).optional(),
    scoring: z.string().trim().min(1).max(48).optional(),
    memory: z.object({
      tone: z.string().trim().min(1).max(48).optional(),
      detailLevel: z.string().trim().min(1).max(32).optional(),
      riskMode: z.string().trim().min(1).max(32).optional(),
    }).optional(),
  }).default({}),
}).superRefine((value, ctx) => {
  if (!value.message.trim() && !value.image) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['message'],
      message: 'Message is required when no image is provided.',
    })
  }
})

function shouldTreatAsJson(req: Request): boolean {
  return req.headers.get('content-type')?.toLowerCase().includes('application/json') === true
}

function resolveServerTier(plans: readonly string[]): UserContext['tier'] {
  return plans.length > 0 ? 'pro' : 'free'
}

function buildCompatibilityPayload(body: unknown, status: number) {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const responseText =
    typeof record.response === 'string'
      ? record.response
      : typeof record.result === 'string'
        ? record.result
        : null
  const upgradeRequired =
    record.upgradeRequired === true ||
    status === 402 ||
    (status === 409 &&
      (record.code === 'token_confirmation_required' || record.code === 'insufficient_token_balance'))

  return {
    ...record,
    response: responseText,
    result: responseText,
    upgradeRequired,
  }
}

async function toCompatibilityResponse(response: Response): Promise<NextResponse> {
  const delegatedBody = await response.json().catch(() => null)
  const headers = new Headers()
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) {
    headers.set('Retry-After', retryAfter)
  }

  return NextResponse.json(buildCompatibilityPayload(delegatedBody, response.status), {
    status: response.status,
    headers,
  })
}

function buildAnthropicSuccessPayload(body: Awaited<ReturnType<typeof runAgentPipeline>>) {
  return {
    ...body,
    response: body.result,
    result: body.result,
    upgradeRequired: body.upgradeRequired === true,
  }
}

function normalizeAnthropicMemory(
  memory: z.infer<typeof ChimmyJsonRequestSchema>['userContext']['memory']
): UserContext['memory'] {
  if (!memory) return undefined

  const tone =
    memory.tone === 'strategic' || memory.tone === 'casual' || memory.tone === 'analytical'
      ? memory.tone
      : undefined
  const detailLevel =
    memory.detailLevel === 'concise' ||
    memory.detailLevel === 'standard' ||
    memory.detailLevel === 'detailed'
      ? memory.detailLevel
      : undefined
  const riskMode =
    memory.riskMode === 'conservative' ||
    memory.riskMode === 'balanced' ||
    memory.riskMode === 'aggressive'
      ? memory.riskMode
      : undefined

  if (!tone && !detailLevel && !riskMode) {
    return undefined
  }

  return {
    tone,
    detailLevel,
    riskMode,
  }
}

function buildAnthropicUserContext(
  payload: z.infer<typeof ChimmyJsonRequestSchema>,
  userId: string,
  tier: UserContext['tier']
): UserContext {
  return {
    userId,
    tier,
    sport: payload.userContext.sport?.toUpperCase() as UserContext['sport'],
    leagueFormat: payload.userContext.leagueFormat as UserContext['leagueFormat'],
    scoring: payload.userContext.scoring ?? null,
    leagueId: payload.userContext.leagueId ?? null,
    season: payload.userContext.season ?? null,
    week: payload.userContext.week ?? null,
    source: payload.userContext.source ?? null,
    conversation: payload.conversation ?? [],
    memory: normalizeAnthropicMemory(payload.userContext.memory),
  }
}

function isAnthropicSupportedRequest(payload: z.infer<typeof ChimmyJsonRequestSchema>): boolean {
  return !payload.image
}

async function logAnthropicUsageToSupabase(args: {
  userId: string
  intent: string
  tokensUsed: number
  model: string
}) {
  if (!isSupabaseConfigured) return

  try {
    const { error } = await supabase.from('usage_logs').insert({
      user_id: args.userId,
      intent: args.intent,
      tokens_used: args.tokensUsed,
      model: args.model,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[api/chimmy] Failed to write Anthropic usage log:', error.message)
    }
  } catch (error) {
    console.error('[api/chimmy] Failed to write Anthropic usage log:', error)
  }
}

async function refundAnthropicTokenFallbackIfNeeded(args: {
  tokenSpendId: string | null
  userId: string
  leagueId?: string
}) {
  if (!args.tokenSpendId) return

  await new TokenSpendService()
    .refundSpendByLedger({
      userId: args.userId,
      spendLedgerId: args.tokenSpendId,
      refundRuleCode: 'feature_execution_failed',
      sourceType: 'anthropic_chimmy_refund',
      sourceId: args.tokenSpendId,
      idempotencyKey: `refund:anthropic_chimmy:${args.tokenSpendId}`,
      description: 'Auto refund after failed Anthropic Chimmy request.',
      metadata: {
        leagueId: args.leagueId ?? null,
      },
    })
    .catch(() => null)
}

function appendImageToFormData(formData: FormData, image?: z.infer<typeof ChimmyImageSchema>) {
  if (!image) return

  const match = image.dataUrl.match(/^data:([^;,]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Image payload must be a valid base64 data URL.')
  }

  const [, mimeType, base64Payload] = match
  const bytes = Buffer.from(base64Payload, 'base64')
  const blob = new Blob([bytes], { type: image.type || mimeType })
  const fileName = image.name?.trim() || `chimmy-upload.${mimeType.split('/')[1] || 'bin'}`
  formData.append('image', blob, fileName)
}

function buildForwardedRequest(req: NextRequest, payload: z.infer<typeof ChimmyJsonRequestSchema>) {
  const formData = new FormData()
  formData.append('message', payload.message)

  if (typeof payload.confirmTokenSpend === 'boolean') {
    formData.append('confirmTokenSpend', String(payload.confirmTokenSpend))
  }
  if (payload.conversation && payload.conversation.length > 0) {
    formData.append('messages', JSON.stringify(payload.conversation))
  }

  if (payload.userContext.sport) {
    formData.append('sport', payload.userContext.sport)
  }
  if (payload.userContext.leagueId) {
    formData.append('leagueId', payload.userContext.leagueId)
  }
  if (payload.userContext.sleeperUsername) {
    formData.append('sleeperUsername', payload.userContext.sleeperUsername)
  }
  if (payload.userContext.insightType) {
    formData.append('insightType', payload.userContext.insightType)
  }
  if (payload.userContext.teamId) {
    formData.append('teamId', payload.userContext.teamId)
  }
  if (typeof payload.userContext.season === 'number') {
    formData.append('season', String(payload.userContext.season))
  }
  if (typeof payload.userContext.week === 'number') {
    formData.append('week', String(payload.userContext.week))
  }
  if (payload.userContext.conversationId) {
    formData.append('conversationId', payload.userContext.conversationId)
  }
  if (payload.userContext.privateMode) {
    formData.append('privateMode', 'true')
  }
  if (payload.userContext.targetUsername) {
    formData.append('targetUsername', payload.userContext.targetUsername)
  }
  if (payload.userContext.strategyMode) {
    formData.append('strategyMode', payload.userContext.strategyMode)
  }
  if (payload.userContext.source) {
    formData.append('source', payload.userContext.source)
  } else {
    formData.append('source', 'api_chimmy_json')
  }
  if (payload.userContext.leagueFormat) {
    formData.append('leagueFormat', payload.userContext.leagueFormat)
  }
  if (payload.userContext.scoring) {
    formData.append('scoring', payload.userContext.scoring)
  }
  if (payload.userContext.memory?.tone) {
    formData.append('tone', payload.userContext.memory.tone)
  }
  if (payload.userContext.memory?.detailLevel) {
    formData.append('detailLevel', payload.userContext.memory.detailLevel)
  }
  if (payload.userContext.memory?.riskMode) {
    formData.append('riskMode', payload.userContext.memory.riskMode)
    if (!payload.userContext.strategyMode) {
      formData.append('strategyMode', payload.userContext.memory.riskMode)
    }
  }
  appendImageToFormData(formData, payload.image)

  const headers = new Headers(req.headers)
  headers.delete('content-type')
  headers.delete('content-length')

  return new Request(req.url, {
    method: 'POST',
    headers,
    body: formData,
  })
}

export async function POST(req: NextRequest) {
  if (!shouldTreatAsJson(req)) {
    return postChatChimmy(req)
  }

  const rawText = await req.text().catch(() => '')
  let rawBody: unknown = null
  if (rawText.trim().length > 0) {
    try {
      rawBody = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid request format.',
          details: {
            formErrors: ['Request body must be valid JSON.'],
            fieldErrors: {},
          },
        },
        { status: 400 }
      )
    }
  }
  const parseResult = ChimmyJsonRequestSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid request format.',
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  const useAnthropicPath =
    (await isAnthropicChimmyEnabled()) &&
    isAnthropicPipelineAvailable() &&
    isAnthropicSupportedRequest(parseResult.data)

  if (!useAnthropicPath) {
    const delegatedResponse = await postChatChimmy(buildForwardedRequest(req, parseResult.data) as any)
    return toCompatibilityResponse(delegatedResponse)
  }

  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null

  const limitRes = await runAiProtection(req, {
    action: 'chimmy',
    getUserId: async () => userId,
  })
  if (limitRes) {
    return toCompatibilityResponse(limitRes)
  }
  if (!userId) {
    return NextResponse.json(buildCompatibilityPayload({ error: 'Unauthorized' }, 401), { status: 401 })
  }

  const gate = await requireFeatureEntitlement({
    userId,
    featureId: 'ai_chat',
    allowTokenFallback: true,
    confirmTokenSpend: Boolean(parseResult.data.confirmTokenSpend),
    tokenRuleCode: 'ai_chimmy_chat_message',
    tokenSourceType: 'anthropic_chimmy_chat',
    tokenSourceId: `${parseResult.data.userContext.leagueId ?? 'no-league'}:${Date.now()}`,
    tokenDescription: 'Anthropic Chimmy chat message',
    tokenMetadata: {
      leagueId: parseResult.data.userContext.leagueId ?? null,
      sport: parseResult.data.userContext.sport ?? null,
      source: parseResult.data.userContext.source ?? 'api_chimmy_json',
    },
  })
  if (!gate.ok) {
    return toCompatibilityResponse(gate.response)
  }

  const resolvedTier = resolveServerTier(gate.decision.entitlement.plans)
  const anthropicContext = buildAnthropicUserContext(parseResult.data, userId, resolvedTier)
  const tokenSpendId = gate.tokenSpend?.id ?? null

  try {
    const result = await runAgentPipeline(parseResult.data.message, anthropicContext)

    if (result.upgradeRequired) {
      await refundAnthropicTokenFallbackIfNeeded({
        tokenSpendId,
        userId,
        leagueId: parseResult.data.userContext.leagueId ?? undefined,
      })
      return NextResponse.json(buildAnthropicSuccessPayload(result), { status: 200 })
    }

    await logAnthropicUsageToSupabase({
      userId,
      intent: result.intent,
      tokensUsed: result.tokensUsed,
      model: result.model,
    })

    return NextResponse.json(buildAnthropicSuccessPayload(result), { status: 200 })
  } catch (error) {
    await refundAnthropicTokenFallbackIfNeeded({
      tokenSpendId,
      userId,
      leagueId: parseResult.data.userContext.leagueId ?? undefined,
    })

    console.error('[api/chimmy] Anthropic pipeline execution failed:', {
      userId,
      leagueId: parseResult.data.userContext.leagueId ?? null,
      source: parseResult.data.userContext.source ?? 'api_chimmy_json',
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    })

    const message = error instanceof Error ? error.message : 'Agent pipeline failed'
    return NextResponse.json(
      buildCompatibilityPayload({ error: message }, 500),
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
