/**
 * Canonical Chimmy route alias.
 * Accepts the legacy JSON contract and maps it into the dedicated Chimmy handler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { POST as postChatChimmy } from '@/app/api/chat/chimmy/route'
import {
  runAgentPipeline,
  streamAgentPipeline,
  isAnthropicPipelineAvailable,
  type UserContext,
} from '@/lib/agents/anthropic-pipeline'
import { runAiProtection } from '@/lib/ai-protection'
import { authOptions } from '@/lib/auth'
import { isAnthropicChimmyEnabled } from '@/lib/feature-toggle'
import {
  CHIMMY_DEFAULT_UPGRADE_PATH,
  CHIMMY_GENERIC_ERROR_MESSAGE,
  CHIMMY_PREMIUM_FEATURE_MESSAGE,
  isChimmyPremiumGateResponse,
  resolveChimmyUpgradePath,
} from '@/lib/chimmy-chat/response-copy'
import { buildChimmyResponseStructure } from '@/lib/chimmy-chat/presentation'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { TokenSpendService } from '@/lib/tokens/TokenSpendService'

const MAX_MESSAGE_CHARS = 4_000
const MAX_CONVERSATION_TURNS = 20
const MAX_CONVERSATION_CONTENT_CHARS = 4_000
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const
const SUPPORTED_ANTHROPIC_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const)

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
  stream: z.boolean().optional(),
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
  const upgradeRequired = isChimmyPremiumGateResponse({
    status,
    code: record.code,
    upgradeRequired: record.upgradeRequired,
  })
  const responseText =
    typeof record.response === 'string'
      ? record.response
      : typeof record.result === 'string'
        ? record.result
        : null
  const normalizedResponse =
    responseText ??
    (upgradeRequired
      ? CHIMMY_PREMIUM_FEATURE_MESSAGE
      : status >= 500
        ? CHIMMY_GENERIC_ERROR_MESSAGE
        : null)
  const upgradePath = upgradeRequired
    ? resolveChimmyUpgradePath(record.upgradePath)
    : typeof record.upgradePath === 'string'
      ? record.upgradePath
      : undefined

  return {
    ...record,
    response: normalizedResponse,
    result: normalizedResponse,
    message:
      typeof record.message === 'string'
        ? record.message
        : normalizedResponse ?? undefined,
    upgradeRequired,
    upgradePath,
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
  const upgradeRequired = body.upgradeRequired === true
  const recommendedTool =
    body.intent === 'trade_evaluation'
      ? 'trade_analyzer'
      : body.intent === 'waiver_wire'
        ? 'waiver_wire'
        : body.intent === 'draft_help'
          ? 'draft_assistant'
          : body.intent === 'matchup_simulator'
            ? 'matchup_simulator'
            : body.intent === 'player_comparison'
              ? 'player_comparison'
              : undefined

  return {
    ...body,
    response: body.result,
    result: body.result,
    meta: {
      responseStructure: buildChimmyResponseStructure(body.result),
      recommendedTool,
    },
    upgradeRequired,
    upgradePath: upgradeRequired
      ? resolveChimmyUpgradePath(body.upgradePath ?? CHIMMY_DEFAULT_UPGRADE_PATH)
      : undefined,
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
  tier: UserContext['tier'],
  image?: UserContext['image']
): UserContext {
  return {
    userId,
    tier,
    sport: payload.userContext.sport?.toUpperCase() as UserContext['sport'],
    leagueFormat: payload.userContext.leagueFormat as UserContext['leagueFormat'],
    scoring: payload.userContext.scoring ?? null,
    leagueId: payload.userContext.leagueId ?? null,
    insightType: payload.userContext.insightType ?? null,
    teamId: payload.userContext.teamId ?? null,
    season: payload.userContext.season ?? null,
    week: payload.userContext.week ?? null,
    source: payload.userContext.source ?? null,
    conversation: payload.conversation ?? [],
    memory: normalizeAnthropicMemory(payload.userContext.memory),
    image: image ?? null,
  }
}

function normalizeAnthropicImagePayload(
  image?: z.infer<typeof ChimmyImageSchema>
): UserContext['image'] {
  if (!image) return null

  const match = image.dataUrl.match(/^data:([^;,]+);base64,(.+)$/)
  if (!match) return null

  const [, mimeTypeFromUrl, base64Payload] = match
  const resolvedMediaType = (image.type?.trim() || mimeTypeFromUrl).toLowerCase()
  if (!SUPPORTED_ANTHROPIC_IMAGE_TYPES.has(resolvedMediaType as NonNullable<UserContext['image']>['mediaType'])) {
    return null
  }

  return {
    data: base64Payload,
    mediaType: resolvedMediaType as NonNullable<UserContext['image']>['mediaType'],
    name: image.name?.trim() || null,
  }
}

function isAnthropicSupportedRequest(
  payload: z.infer<typeof ChimmyJsonRequestSchema>,
  normalizedImage: UserContext['image']
): boolean {
  return !payload.image || Boolean(normalizedImage)
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

function encodeSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
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

  const anthropicImage = normalizeAnthropicImagePayload(parseResult.data.image)
  const useAnthropicPath =
    (await isAnthropicChimmyEnabled()) &&
    isAnthropicPipelineAvailable() &&
    isAnthropicSupportedRequest(parseResult.data, anthropicImage)

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
  const anthropicContext = buildAnthropicUserContext(parseResult.data, userId, resolvedTier, anthropicImage)
  const tokenSpendId = gate.tokenSpend?.id ?? null
  const wantsStream = parseResult.data.stream === true

  try {
    if (wantsStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const push = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(encodeSseEvent(event, data)))
          }

          void (async () => {
            try {
              const result = await streamAgentPipeline(
                parseResult.data.message,
                anthropicContext,
                (delta, snapshot) => {
                  push('chunk', { delta, response: snapshot })
                }
              )

              if (result.upgradeRequired) {
                await refundAnthropicTokenFallbackIfNeeded({
                  tokenSpendId,
                  userId,
                  leagueId: parseResult.data.userContext.leagueId ?? undefined,
                })
                push('done', buildAnthropicSuccessPayload(result))
                controller.close()
                return
              }

              await logAnthropicUsageToSupabase({
                userId,
                intent: result.intent,
                tokensUsed: result.tokensUsed,
                model: result.model,
              })

              push('done', buildAnthropicSuccessPayload(result))
              controller.close()
            } catch (error) {
              await refundAnthropicTokenFallbackIfNeeded({
                tokenSpendId,
                userId,
                leagueId: parseResult.data.userContext.leagueId ?? undefined,
              })

              console.error('[api/chimmy] Anthropic pipeline stream failed:', {
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

              push('error', {
                error: error instanceof Error ? error.message : 'Agent pipeline failed',
              })
              controller.close()
            }
          })()
        },
      })

      return new Response(stream, {
        status: 200,
        headers: SSE_HEADERS,
      })
    }

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
