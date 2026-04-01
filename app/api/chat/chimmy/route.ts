import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { authOptions } from '@/lib/auth'
import { runPECR } from '@/lib/ai/pecr'
import { runAiProtection } from '@/lib/ai-protection'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration/orchestration-service'
import {
  requestContractToUnified,
  unifiedResponseToContract,
  validateToolRequest,
  type AIToolResponseContract,
} from '@/lib/ai-tool-registry'
import { getInsightBundle } from '@/lib/ai-simulation-integration'
import type { InsightType } from '@/lib/ai-simulation-integration'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { enrichChatWithData } from '@/lib/chat-data-enrichment'
import { buildMemoryPromptSection, getFullAIContext } from '@/lib/ai-memory'
import { getChimmyMemoryContext } from '@/lib/ai-memory/chimmy-memory-context'
import { appendChatHistory, buildChimmyConversationId } from '@/lib/ai-memory/chat-history-store'
import { rememberChimmyAssistantMemory, rememberChimmyUserMessageMemory } from '@/lib/ai-memory/ai-memory-store'
import { buildAgentPrompt, inferAgentFromMessage } from '@/lib/agents/pipeline'
import { CHIMMY_GENERIC_ERROR_MESSAGE } from '@/lib/chimmy-chat/response-copy'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import {
  TokenInsufficientBalanceError,
  TokenSpendConfirmationRequiredError,
  TokenSpendService,
  TokenSpendRuleNotFoundError,
  type TokenSpendPreview,
} from '@/lib/tokens/TokenSpendService'

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

type ToolKey = 'trade_analyzer' | 'trade_finder' | 'waiver_ai' | 'rankings' | 'mock_draft' | 'none'

type ChimmyPECRExecutionOutput = {
  responseContract: AIToolResponseContract
  modelOutputs?: Array<{
    model?: string
    modelName?: string
    skipped?: boolean
    tokensPrompt?: number
    tokensCompletion?: number
  }>
  sanitizedAiExplanation: string
  sanitizedActionPlan: string
  sanitizedUncertainty: string
  providerStatus: Record<string, string>
  quantData?: Record<string, unknown>
  trendData?: Record<string, unknown>
  recommendedTool: ToolKey
  toolLinks: string[]
  responseStructure: ReturnType<typeof buildResponseStructure>
  processingMs: number
}

const PECR_VALID_TOOL_ROUTES = new Set([
  '/trade-analyzer',
  '/waiver-wire',
  '/draft-helper',
  '/rankings',
  '/mock-draft',
  '/fantasy-coach',
  '/player-comparison',
])

class ChimmyPECRExecutionError extends Error {
  status: number
  userMessage: string
  traceId?: string

  constructor(message: string, status: number, userMessage: string, traceId?: string) {
    super(message)
    this.name = 'ChimmyPECRExecutionError'
    this.status = status
    this.userMessage = userMessage
    this.traceId = traceId
  }
}

const INSIGHT_TYPE_VALUES = [
  'matchup',
  'playoff',
  'dynasty',
  'trade',
  'waiver',
  'draft',
] as const satisfies readonly InsightType[]

const MAX_MESSAGE_CHARS = 4_000
const MAX_CONVERSATION_TURNS = 20
const MAX_CONVERSATION_CONTEXT_TURNS = 10
const MAX_CONVERSATION_CONTENT_CHARS = 4_000
const MAX_GENERIC_FIELD_CHARS = 120
const MAX_USERNAME_CHARS = 80
const MAX_SOURCE_CHARS = 64
const MAX_STRATEGY_MODE_CHARS = 48
const MAX_SPORT_CHARS = 32
const MAX_LEAGUE_FORMAT_CHARS = 48
const MAX_SCORING_CHARS = 48
const MAX_TONE_CHARS = 48
const MAX_DETAIL_LEVEL_CHARS = 32
const MAX_RISK_MODE_CHARS = 32
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ALLOWED_SCREENSHOT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const ConversationTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_CONVERSATION_CONTENT_CHARS),
})

const optionalTrimmedStringField = (maxLength: number) =>
  z.preprocess((value) => {
    if (value == null) return undefined
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }, z.string().max(maxLength).optional())

const booleanFormField = z.preprocess((value) => {
  if (value == null || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return value

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return value
}, z.boolean())

function optionalIntFormField(min: number, max: number) {
  return z.preprocess((value) => {
    if (value == null || value === '') return undefined
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return value

    const trimmed = value.trim()
    if (!trimmed) return undefined
    return Number(trimmed)
  }, z.number().int().min(min).max(max).optional())
}

const ChimmyFormSchema = z.object({
  message: z.preprocess((value) => {
    if (value == null) return ''
    if (typeof value !== 'string') return value
    return value.trim()
  }, z.string().max(MAX_MESSAGE_CHARS)),
  confirmTokenSpend: booleanFormField,
  conversationId: optionalTrimmedStringField(MAX_GENERIC_FIELD_CHARS),
  privateMode: booleanFormField,
  targetUsername: optionalTrimmedStringField(MAX_USERNAME_CHARS),
  strategyMode: optionalTrimmedStringField(MAX_STRATEGY_MODE_CHARS),
  source: optionalTrimmedStringField(MAX_SOURCE_CHARS),
  leagueId: optionalTrimmedStringField(MAX_GENERIC_FIELD_CHARS),
  sleeperUsername: optionalTrimmedStringField(MAX_USERNAME_CHARS),
  teamId: optionalTrimmedStringField(MAX_GENERIC_FIELD_CHARS),
  sport: optionalTrimmedStringField(MAX_SPORT_CHARS),
  leagueFormat: optionalTrimmedStringField(MAX_LEAGUE_FORMAT_CHARS),
  scoring: optionalTrimmedStringField(MAX_SCORING_CHARS),
  tone: optionalTrimmedStringField(MAX_TONE_CHARS),
  detailLevel: optionalTrimmedStringField(MAX_DETAIL_LEVEL_CHARS),
  riskMode: optionalTrimmedStringField(MAX_RISK_MODE_CHARS),
  season: optionalIntFormField(1900, 3000),
  week: optionalIntFormField(1, 100),
  insightType: z.preprocess((value) => {
    if (value == null) return undefined
    if (typeof value !== 'string') return value
    const trimmed = value.trim().toLowerCase()
    return trimmed.length > 0 ? trimmed : undefined
  }, z.enum(INSIGHT_TYPE_VALUES).optional()),
  conversation: z.array(ConversationTurnSchema).max(MAX_CONVERSATION_TURNS),
  hasImage: z.boolean(),
})

const SPORTS_KEYWORDS = [
  'trade', 'waiver', 'draft', 'player', 'pick', 'roster', 'lineup',
  'start', 'sit', 'drop', 'add', 'quarterback', 'receiver', 'running back',
  'tight end', 'kicker', 'defense', 'fantasy', 'points', 'league', 'playoffs',
  'standings', 'bench', 'injury', 'bye week', 'matchup', 'projection',
  'qb', 'rb', 'wr', 'te', 'flex', 'superflex', 'ppr', 'dynasty', 'keeper',
  'faab', 'auction', 'nfl', 'nba', 'mlb', 'basketball', 'baseball', 'football',
  'nhl', 'hockey', 'soccer', 'ncaab', 'ncaaf',
]

function hasSportsContent(text: string, hasImage: boolean): boolean {
  if (hasImage) return true
  const lower = text.toLowerCase()
  return SPORTS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function parseConversationPayload(raw: FormDataEntryValue | null): unknown {
  if (raw == null) return []
  if (typeof raw !== 'string') {
    throw new Error('Conversation payload must be a JSON string.')
  }

  if (raw.trim().length === 0) return []
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Conversation payload must be valid JSON.')
  }
}

function validateScreenshotFile(raw: FormDataEntryValue | null): {
  file: File | null
  hasImage: boolean
  error?: string
} {
  if (raw == null) {
    return { file: null, hasImage: false }
  }

  if (!(raw instanceof File)) {
    return {
      file: null,
      hasImage: false,
      error: 'Image must be uploaded as a file.',
    }
  }

  if (raw.size <= 0) {
    return { file: null, hasImage: false }
  }

  if (!ALLOWED_SCREENSHOT_TYPES.has(raw.type)) {
    return {
      file: null,
      hasImage: false,
      error: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.',
    }
  }

  if (raw.size > MAX_SCREENSHOT_BYTES) {
    return {
      file: null,
      hasImage: false,
      error: 'Image too large (max 5MB).',
    }
  }

  return { file: raw, hasImage: true }
}

function extractFirstSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const match = trimmed.match(/(.+?[.!?])(\s|$)/)
  return (match?.[1] ?? trimmed).slice(0, 220)
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  if (!raw || !raw.trim()) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const candidate = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    try {
      return JSON.parse(candidate) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function findJsonLikeObjectRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  let depth = 0
  let start = -1
  let inString = false
  let stringQuote = ''
  let escaped = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (inString) {
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === stringQuote) {
        inString = false
        stringQuote = ''
      }
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringQuote = char
      continue
    }

    if (char === '{') {
      if (depth === 0) {
        start = i
      }
      depth += 1
      continue
    }

    if (char === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, i + 1)
        if (candidate.includes(':')) {
          ranges.push({ start, end: i + 1 })
        }
        start = -1
      }
    }
  }

  return ranges
}

function sanitizeAssistantDisplayText(raw: string | null | undefined): string {
  const normalized = String(raw ?? '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  if (!normalized) return ''

  const jsonRanges = findJsonLikeObjectRanges(normalized)
  if (jsonRanges.length === 0) {
    return normalized
  }

  const trailingText = normalized
    .slice(jsonRanges[jsonRanges.length - 1].end)
    .replace(/^[\s\-:;,.!?)\]}]+/, '')
    .trim()

  if (trailingText) {
    return trailingText
  }

  let stripped = ''
  let cursor = 0
  for (const range of jsonRanges) {
    stripped += normalized.slice(cursor, range.start)
    cursor = range.end
  }
  stripped += normalized.slice(cursor)

  const cleaned = stripped
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([:;,.!?])(?:\s*\1)+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return cleaned || normalized
}

function compactRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined)
  return Object.fromEntries(entries)
}

function inferRecommendedTool(answer: string, actionPlan?: string | null): ToolKey {
  const text = `${answer}\n${actionPlan ?? ''}`.toLowerCase()
  if (/trade|offer|accept|decline/.test(text)) return 'trade_analyzer'
  if (/waiver|faab|pickup|free agent/.test(text)) return 'waiver_ai'
  if (/rank|tiers|ranking/.test(text)) return 'rankings'
  if (/mock draft|draft sim/.test(text)) return 'mock_draft'
  return 'none'
}

function classifyPecrIntent(message: string): string {
  if (/trade|swap|offer|deal|give|receiv/i.test(message)) return 'trade'
  if (/waiver|wire|pickup|drop|add|free.?agent/i.test(message)) return 'waiver'
  if (/roster|lineup|start|sit|bench|flex/i.test(message)) return 'roster'
  if (/draft|pick|adp|tier|rank/i.test(message)) return 'draft'
  return 'general'
}

function resolveRecommendedToolLinks(recommendedTool: ToolKey): string[] {
  switch (recommendedTool) {
    case 'trade_analyzer':
      return ['/trade-analyzer']
    case 'waiver_ai':
      return ['/waiver-wire']
    case 'rankings':
      return ['/rankings']
    case 'mock_draft':
      return ['/mock-draft']
    default:
      return []
  }
}

function buildProviderStatusMap(responseContract: AIToolResponseContract): Record<string, string> {
  const status: Record<string, string> = {
    openai: 'skipped',
    deepseek: 'skipped',
    grok: 'skipped',
  }

  for (const provider of responseContract.reliability?.providerStatus ?? []) {
    status[provider.provider] =
      provider.status === 'ok'
        ? 'ok'
        : provider.status === 'timeout'
          ? 'error'
          : provider.status === 'invalid_response'
            ? 'error'
            : 'error'
  }

  return status
}

function extractQuantData(responseContract: AIToolResponseContract): Record<string, unknown> | undefined {
  const deepseek = responseContract.providerResults.find((provider) => provider.provider === 'deepseek')
  if (!deepseek?.raw) return undefined
  const parsed = safeParseJson(deepseek.raw)
  return parsed ?? undefined
}

function extractTrendData(responseContract: AIToolResponseContract): Record<string, unknown> | undefined {
  const grok = responseContract.providerResults.find((provider) => provider.provider === 'grok')
  if (!grok?.raw) return undefined
  const parsed = safeParseJson(grok.raw)
  return parsed ?? undefined
}

function buildResponseStructure(
  answer: string,
  actionPlan?: string | null,
  uncertainty?: string | null
): {
  shortAnswer: string
  whatDataSays?: string
  whatItMeans?: string
  recommendedAction?: string
  caveats?: string[]
} {
  const shortAnswer = extractFirstSentence(answer) || 'Chimmy response available.'
  return {
    shortAnswer,
    whatDataSays: extractFirstSentence(answer),
    whatItMeans: actionPlan ? extractFirstSentence(actionPlan) : undefined,
    recommendedAction: actionPlan ?? undefined,
    caveats: uncertainty ? [uncertainty] : undefined,
  }
}

function resolveUsageLogModel(args: {
  providerUsed?: string | null
  modelOutputs?: Array<{
    model?: string
    modelName?: string
    skipped?: boolean
  }>
}): string {
  const outputs = Array.isArray(args.modelOutputs) ? args.modelOutputs : []
  const selectedOutput =
    (args.providerUsed
      ? outputs.find((output) => output.model === args.providerUsed && output.skipped !== true)
      : undefined) ??
    outputs.find((output) => output.skipped !== true) ??
    outputs[0]

  return selectedOutput?.modelName || selectedOutput?.model || args.providerUsed || 'unknown'
}

function resolveUsageLogTokensUsed(modelOutputs?: Array<{
  tokensPrompt?: number
  tokensCompletion?: number
}>): number {
  if (!Array.isArray(modelOutputs) || modelOutputs.length === 0) {
    return 0
  }

  return modelOutputs.reduce((sum, output) => {
    return sum + Math.max(0, output.tokensPrompt ?? 0) + Math.max(0, output.tokensCompletion ?? 0)
  }, 0)
}

async function logUsageToSupabase(args: {
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
      console.error('[chat/chimmy] Failed to write usage log:', error.message)
    }
  } catch (error) {
    console.error('[chat/chimmy] Failed to write usage log:', error)
  }
}

function getVisionClient(): OpenAI | null {
  const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    return new OpenAI({
      apiKey: key,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
  } catch {
    return null
  }
}

async function parseScreenshotWithVision(imageFile: File, userQuestion: string): Promise<string> {
  const openai = getVisionClient()
  if (!openai) {
    return 'Image uploaded; vision extraction unavailable (provider not configured).'
  }
  try {
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const base64 = buffer.toString('base64')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are extracting deterministic fantasy context from an uploaded screenshot. ' +
            'Return a concise plain-text summary with only what is visible (players, teams, values, injuries, lineup/draft/trade context).',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userQuestion || 'Summarize visible fantasy context from this screenshot.' },
            { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64}`, detail: 'high' } },
          ],
        },
      ],
    })
    return response.choices[0]?.message?.content?.trim() || 'Image uploaded; no extractable fantasy context returned.'
  } catch {
    return 'Image uploaded; vision extraction failed.'
  }
}

function buildUserMessage(input: {
  message: string
  conversation: ConversationTurn[]
  screenshotSummary?: string
  insightSummary?: string
  memorySection?: string
  leagueFormat?: string
  scoring?: string
  strategyMode?: string
  tone?: string
  detailLevel?: string
  riskMode?: string
  privateMode: boolean
  targetUsername?: string
}): string {
  const parts: string[] = []
  parts.push(`USER QUESTION:\n${input.message || 'Analyze my fantasy context and recommend next moves.'}`)

  if (input.strategyMode) {
    parts.push(`STRATEGY MODE:\n${input.strategyMode}`)
  }

  if (input.leagueFormat || input.scoring) {
    const leagueContext = [
      input.leagueFormat ? `Format: ${input.leagueFormat}` : null,
      input.scoring ? `Scoring: ${input.scoring}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    if (leagueContext) {
      parts.push(`LEAGUE CONTEXT:\n${leagueContext}`)
    }
  }

  if (input.tone || input.detailLevel || input.riskMode) {
    const preferenceContext = [
      input.tone ? `Tone: ${input.tone}` : null,
      input.detailLevel ? `Detail Level: ${input.detailLevel}` : null,
      input.riskMode ? `Risk Mode: ${input.riskMode}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    if (preferenceContext) {
      parts.push(`RESPONSE PREFERENCES:\n${preferenceContext}`)
    }
  }

  if (input.privateMode && input.targetUsername) {
    parts.push(`PRIVATE MODE TARGET:\n${input.targetUsername}`)
  }

  if (input.conversation.length > 0) {
    const convo = input.conversation
      .slice(-8)
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Chimmy'}: ${turn.content}`)
      .join('\n')
    parts.push(`RECENT CONVERSATION:\n${convo}`)
  }

  if (input.screenshotSummary) {
    parts.push(`SCREENSHOT SUMMARY:\n${input.screenshotSummary}`)
  }

  if (input.insightSummary) {
    parts.push(`SIMULATION / WAREHOUSE CONTEXT:\n${input.insightSummary}`)
  }

  if (input.memorySection) {
    parts.push(`MEMORY CONTEXT:\n${input.memorySection}`)
  }

  return parts.join('\n\n---\n\n')
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now()
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null

  const limitRes = await runAiProtection(req, {
    action: 'chimmy',
    getUserId: async () => userId,
  })
  if (limitRes) return limitRes
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const imageValidation = validateScreenshotFile(formData.get('image'))
  if (imageValidation.error) {
    return NextResponse.json({ error: imageValidation.error }, { status: 400 })
  }

  let conversationPayload: unknown
  try {
    conversationPayload = parseConversationPayload(
      formData.get('messages') ?? formData.get('conversation')
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Conversation payload is invalid.',
      },
      { status: 400 }
    )
  }

  const parseResult = ChimmyFormSchema.safeParse({
    message: formData.get('message'),
    confirmTokenSpend: formData.get('confirmTokenSpend'),
    conversationId: formData.get('conversationId'),
    privateMode: formData.get('privateMode'),
    targetUsername: formData.get('targetUsername'),
    strategyMode: formData.get('strategyMode'),
    source: formData.get('source'),
    leagueId: formData.get('leagueId'),
    sleeperUsername: formData.get('sleeperUsername'),
    teamId: formData.get('teamId'),
    sport: formData.get('sport'),
    leagueFormat: formData.get('leagueFormat'),
    scoring: formData.get('scoring'),
    tone: formData.get('tone'),
    detailLevel: formData.get('detailLevel'),
    riskMode: formData.get('riskMode'),
    season: formData.get('season'),
    week: formData.get('week'),
    insightType: formData.get('insightType'),
    conversation: conversationPayload,
    hasImage: imageValidation.hasImage,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid request format.',
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  const {
    message,
    confirmTokenSpend,
    conversationId: explicitConversationId,
    privateMode,
    targetUsername,
    strategyMode,
    source,
    leagueId,
    sleeperUsername,
    teamId,
    sport: sportRaw,
    leagueFormat,
    scoring,
    tone,
    detailLevel,
    riskMode,
    season,
    week,
    insightType,
    conversation: parsedConversation,
    hasImage,
  } = parseResult.data
  const conversation = parsedConversation.slice(-MAX_CONVERSATION_CONTEXT_TURNS)
  const imageFile = imageValidation.file
  const sport = normalizeToSupportedSport(sportRaw || undefined)
  const effectiveStrategyMode = strategyMode ?? riskMode
  const conversationId = buildChimmyConversationId({
    userId,
    leagueId: leagueId ?? null,
    explicitConversationId,
  })

  if (!message && !hasImage) {
    return NextResponse.json({
      response: 'Ask me a fantasy sports question, share roster context, or upload a screenshot for analysis.',
    })
  }

  const domainInput = [message, ...conversation.map((turn) => turn.content)].join(' ')
  if (!hasSportsContent(domainInput, hasImage)) {
    return NextResponse.json({
      response:
        "I'm Chimmy, your fantasy sports assistant. I can help with trades, waivers, matchups, and lineup strategy.",
      meta: {
        confidencePct: 100,
        providerStatus: {
          openai: 'skipped',
          deepseek: 'skipped',
          grok: 'skipped',
        },
        recommendedTool: 'none',
        dataSources: [],
        responseStructure: {
          shortAnswer: 'I can help with fantasy sports questions only.',
          recommendedAction: 'Share your fantasy question and league context.',
          caveats: ['Off-topic requests are redirected to fantasy guidance.'],
        },
      },
    })
  }

  const dataSources: string[] = []

  const screenshotTask: Promise<string | undefined> =
    hasImage && imageFile
      ? parseScreenshotWithVision(imageFile, message)
      : Promise.resolve(undefined)
  const insightTask: Promise<{ summary?: string; sources: string[] } | undefined> =
    leagueId && insightType
      ? getInsightBundle(leagueId, insightType, {
          teamId,
          season,
          week,
          sport,
        })
          .then((bundle) => ({
            summary: bundle.contextText || undefined,
            sources: bundle.sources.map((source) => `ai_${source}`),
          }))
          .catch(() => undefined)
      : Promise.resolve(undefined)
  const memoryTask: Promise<string | undefined> =
    userId
      ? getChimmyMemoryContext({
          userId,
          leagueId: leagueId ?? null,
          conversationId,
          sleeperUsername: sleeperUsername ?? null,
        })
          .then((ctx) => (ctx.promptSection?.trim().length ? ctx.promptSection : undefined))
          .catch(() => undefined)
      : Promise.resolve(undefined)

  const [screenshotResult, insightResult, memoryResult] = await Promise.allSettled([
    screenshotTask,
    insightTask,
    memoryTask,
  ])
  const screenshotSummary = screenshotResult.status === 'fulfilled' ? screenshotResult.value : undefined
  const insightSummary = insightResult.status === 'fulfilled' ? insightResult.value?.summary : undefined
  const insightSources = insightResult.status === 'fulfilled' ? insightResult.value?.sources ?? [] : []
  const memorySection = memoryResult.status === 'fulfilled' ? memoryResult.value : undefined

  if (screenshotSummary) dataSources.push('screenshot_vision')
  if (insightSources.length > 0) dataSources.push(...insightSources)
  if (memorySection) dataSources.push('ai_memory', 'chat_history')

  const baseUserMessage = buildUserMessage({
    message,
    conversation,
    screenshotSummary,
    insightSummary,
    memorySection,
    leagueFormat,
    scoring,
    strategyMode: effectiveStrategyMode,
    tone,
    detailLevel,
    riskMode,
    privateMode,
    targetUsername,
  })

  const deterministicContext = compactRecord({
    contextSnapshot: compactRecord({
      leagueId,
      sleeperUsername,
      teamId,
      sport,
      season,
      week,
      insightType,
      privateMode,
      targetUsername,
      strategyMode: effectiveStrategyMode,
      leagueFormat,
      scoring,
      tone,
      detailLevel,
      riskMode,
      source,
      conversationId,
    }),
    matchupData: insightType === 'matchup'
      ? compactRecord({ leagueId, teamId, week, season, summary: insightSummary })
      : undefined,
    projections: insightType === 'playoff' || /projection|projected|win probability/i.test(message)
      ? compactRecord({ season, week, summary: insightSummary })
      : undefined,
    rosterNeeds: /roster|lineup|need|depth/i.test(message)
      ? compactRecord({ summary: insightSummary || message.slice(0, 280) })
      : undefined,
    adpComparisons: /adp|value pick|reach/i.test(message)
      ? compactRecord({ summary: message.slice(0, 280) })
      : undefined,
    rankings: /rank|ranking|tiers/i.test(message)
      ? compactRecord({ summary: insightSummary || message.slice(0, 280) })
      : undefined,
    scoringOutputs: /score|points|scoring|projection/i.test(message)
      ? compactRecord({ summary: insightSummary || message.slice(0, 280) })
      : undefined,
    screenshotEvidence: screenshotSummary,
    memoryContext: memorySection
      ? compactRecord({
          conversationId,
          promptSection: memorySection.slice(0, 4000),
        })
      : undefined,
  })

  const leagueSettings = compactRecord({
    sport,
    season,
    week,
    insightType,
    source,
    privateMode,
    targetUsername,
    leagueFormat,
    scoring,
    tone,
    detailLevel,
    riskMode,
  })

  const specialistAgent = inferAgentFromMessage(
    [message, effectiveStrategyMode, leagueFormat, insightType].filter(Boolean).join('\n')
  )
  const recentConversationContext = conversation
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join('\n')
  let userMessage = baseUserMessage
  try {
    userMessage = await buildAgentPrompt({
      agent: specialistAgent,
      userMessage: baseUserMessage,
      sport,
      deterministicContext,
      conversationContext: recentConversationContext || undefined,
    })
    dataSources.push(`agent_prompt_${specialistAgent}`)
  } catch {
    userMessage = baseUserMessage
  }

  const validation = validateToolRequest('chimmy_chat', deterministicContext, {
    leagueSettings,
    sport,
  })
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: validation.error ?? 'Invalid Chimmy request.',
      },
      { status: 400 }
    )
  }

  const spendService = new TokenSpendService()
  let tokenPreview: TokenSpendPreview | null = null
  let tokenPreviewFailed = false
  try {
    tokenPreview = await spendService.previewSpend(userId, 'ai_chimmy_chat_message')
  } catch (error) {
    if (error instanceof TokenSpendRuleNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'token_spend_rule_missing',
        },
        { status: 500 }
      )
    }
    tokenPreviewFailed = true
    console.error(
      '[api/chat/chimmy] Token preview failed, continuing without preflight:',
      error instanceof Error ? error.message : error
    )
  }
  if (!tokenPreviewFailed && tokenPreview?.requiresConfirmation !== false && !confirmTokenSpend) {
    return NextResponse.json(
      {
        error: 'Token spend confirmation required before sending to Chimmy.',
        code: 'token_confirmation_required',
        preview: tokenPreview,
      },
      { status: 409 }
    )
  }

  let spendLedger: { id: string; balanceAfter: number } | null = null
  if (!tokenPreviewFailed) {
    try {
      const ledger = await spendService.spendTokensForRule({
        userId,
        ruleCode: 'ai_chimmy_chat_message',
        confirmed: confirmTokenSpend,
        sourceType: 'chimmy_chat',
        sourceId: conversationId,
        description: 'Chimmy chat message',
        metadata: {
          conversationId,
          leagueId: leagueId ?? null,
          sport,
          source: source ?? null,
        },
      })
      spendLedger = {
        id: ledger.id,
        balanceAfter: ledger.balanceAfter,
      }
    } catch (error) {
      if (error instanceof TokenInsufficientBalanceError) {
        return NextResponse.json(
          {
            error: 'Insufficient token balance',
            code: 'insufficient_token_balance',
            requiredTokens: error.requiredTokens,
            currentBalance: error.currentBalance,
          },
          { status: 402 }
        )
      }
      if (error instanceof TokenSpendConfirmationRequiredError) {
        return NextResponse.json(
          {
            error: 'Token spend confirmation required.',
            code: 'token_confirmation_required',
            requiredTokens: error.tokenCost,
            ruleCode: error.ruleCode,
          },
          { status: 409 }
        )
      }
      if (error instanceof TokenSpendRuleNotFoundError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'token_spend_rule_missing',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: 'Unable to process token spend.' }, { status: 500 })
    }
  }

  const unifiedRequest = requestContractToUnified(
    {
      tool: 'chimmy_chat',
      sport,
      leagueId: leagueId ?? null,
      userId,
      leagueSettings,
      deterministicContext,
      userMessage,
      aiMode: 'unified_brain',
      provider: null,
    },
    userId
  )

  let pecrIntent = 'general'
  try {
    const pecrResult = await runPECR(
      {
        message,
        userId,
        leagueId: leagueId ?? undefined,
        sleeperUsername: sleeperUsername ?? undefined,
        teamId: teamId ?? undefined,
      },
      {
        feature: 'chimmy',
        plan: async (planInput) => {
          const intent = classifyPecrIntent(planInput.message)
          pecrIntent = intent

          const [legacyEnrichment, legacyMemory] = await Promise.allSettled([
            enrichChatWithData(planInput.message, {
              leagueId: planInput.leagueId,
              sleeperUsername: planInput.sleeperUsername,
            }),
            getFullAIContext({
              userId: planInput.userId,
              sleeperUsername: planInput.sleeperUsername,
              leagueId: planInput.leagueId,
              teamId: planInput.teamId,
            }),
          ])

          const enrichmentLoaded =
            legacyEnrichment.status === 'fulfilled' &&
            (legacyEnrichment.value.context.trim().length > 0 ||
              legacyEnrichment.value.audit.sourcesUsed.length > 0)

          const legacyMemorySection =
            legacyMemory.status === 'fulfilled'
              ? buildMemoryPromptSection(legacyMemory.value).trim()
              : ''

          return {
            intent,
            steps: ['classify intent', 'run current chimmy orchestration', 'validate answer'],
            context: {
              enrichmentLoaded,
              enrichmentSources:
                legacyEnrichment.status === 'fulfilled'
                  ? legacyEnrichment.value.audit.sourcesUsed
                  : [],
              legacyMemoryLoaded: legacyMemorySection.length > 0,
              legacyMemorySection,
            },
            refineHints: [],
          }
        },
        execute: async () => {
          const run = await runUnifiedOrchestration(unifiedRequest)
          if (!run.ok) {
            throw new ChimmyPECRExecutionError(
              run.error.message,
              run.status,
              run.error.userMessage || 'Unable to process Chimmy request.',
              run.error.traceId
            )
          }

          const responseContract = unifiedResponseToContract(run.response)
          const sanitizedAiExplanation = sanitizeAssistantDisplayText(responseContract.aiExplanation)
          const sanitizedActionPlan = sanitizeAssistantDisplayText(responseContract.actionPlan)
          const sanitizedUncertainty = sanitizeAssistantDisplayText(responseContract.uncertainty)
          const providerStatus = buildProviderStatusMap(responseContract)
          const quantData = extractQuantData(responseContract)
          const trendData = extractTrendData(responseContract)
          const recommendedTool = inferRecommendedTool(
            sanitizedAiExplanation,
            sanitizedActionPlan
          )
          const toolLinks = resolveRecommendedToolLinks(recommendedTool)
          const responseStructure = buildResponseStructure(
            sanitizedAiExplanation,
            sanitizedActionPlan,
            sanitizedUncertainty
          )

          return {
            responseContract,
            modelOutputs: run.response.modelOutputs,
            sanitizedAiExplanation,
            sanitizedActionPlan,
            sanitizedUncertainty,
            providerStatus,
            quantData,
            trendData,
            recommendedTool,
            toolLinks,
            responseStructure,
            processingMs: Date.now() - startMs,
          }
        },
        check: (output, plan) => {
          const failures: string[] = []
          const answer = output.sanitizedAiExplanation.trim()

          if (answer.length <= 30) {
            failures.push('answer length must be greater than 30 characters')
          }

          if (
            ['trade', 'waiver', 'roster'].includes(plan.intent) &&
            plan.context.enrichmentLoaded === true &&
            /i don't have access|i cannot access/i.test(answer)
          ) {
            failures.push('answer claims context is unavailable despite loaded enrichment')
          }

          const invalidToolLinks = output.toolLinks.filter((link) => !PECR_VALID_TOOL_ROUTES.has(link))
          if (invalidToolLinks.length > 0) {
            failures.push(`invalid tool links: ${invalidToolLinks.join(', ')}`)
          }

          return {
            passed: failures.length === 0,
            failures,
            refineHint:
              failures.length > 0
                ? 'Player and league context is loaded. Reference it explicitly in your answer.'
                : undefined,
          }
        },
      }
    )

    const pecrOutput = pecrResult.output
    await logUsageToSupabase({
      userId,
      intent: specialistAgent,
      tokensUsed: resolveUsageLogTokensUsed(pecrOutput.modelOutputs),
      model: resolveUsageLogModel({
        providerUsed: pecrOutput.responseContract.debugTrace?.providerUsed ?? null,
        modelOutputs: pecrOutput.modelOutputs,
      }),
    })

    const meta = {
      assistant: 'Chimmy',
      conversationId,
      agent: specialistAgent,
      confidencePct: pecrOutput.responseContract.confidence ?? undefined,
      providerStatus: pecrOutput.providerStatus,
      recommendedTool: pecrOutput.recommendedTool,
      dataSources: dataSources.length ? dataSources : undefined,
      tokenSpend: spendLedger && tokenPreview
        ? {
            ruleCode: tokenPreview.ruleCode,
            tokenCost: tokenPreview.tokenCost,
            balanceAfter: spendLedger.balanceAfter,
            ledgerId: spendLedger.id,
          }
        : undefined,
      quantData: pecrOutput.quantData,
      trendData: pecrOutput.trendData,
      responseStructure: pecrOutput.responseStructure,
      reliability: pecrOutput.responseContract.reliability ?? undefined,
      traceId: pecrOutput.responseContract.traceId ?? undefined,
      processingMs: pecrOutput.processingMs,
    }

    if (userId) {
      const assistantResponse = pecrOutput.sanitizedAiExplanation || CHIMMY_GENERIC_ERROR_MESSAGE
      const persistTasks = [
        appendChatHistory({
          conversationId,
          role: 'user',
          content: message || '[image-only request]',
          userId,
          leagueId: leagueId ?? null,
        }),
        appendChatHistory({
          conversationId,
          role: 'assistant',
          content: assistantResponse,
          userId,
          leagueId: leagueId ?? null,
          meta: {
            recommendedTool: pecrOutput.recommendedTool,
            confidence: pecrOutput.responseContract.confidence ?? null,
          },
        }),
        rememberChimmyUserMessageMemory({
          userId,
          leagueId: leagueId ?? null,
          sport,
          message: message || '[image-only request]',
        }),
        rememberChimmyAssistantMemory({
          userId,
          leagueId: leagueId ?? null,
          answer: assistantResponse,
          recommendedTool: pecrOutput.recommendedTool,
          confidence: pecrOutput.responseContract.confidence ?? null,
        }),
      ]
      await Promise.allSettled(persistTasks)
    }

    return NextResponse.json(
      {
        response: pecrOutput.sanitizedAiExplanation || CHIMMY_GENERIC_ERROR_MESSAGE,
        meta,
      },
      {
        headers: {
          'x-pecr-iterations': String(pecrResult.iterations),
          'x-pecr-passed': String(pecrResult.passed),
          'x-pecr-intent': pecrIntent,
        },
      }
    )
  } catch (error) {
    if (spendLedger?.id) {
      await spendService
        .refundSpendByLedger({
          userId,
          spendLedgerId: spendLedger.id,
          refundRuleCode: 'feature_execution_failed',
          sourceType: 'chimmy_chat_refund',
          sourceId: spendLedger.id,
          idempotencyKey: `refund:chimmy_chat:${spendLedger.id}`,
          description: 'Auto refund after failed Chimmy request.',
          metadata: { conversationId, leagueId: leagueId ?? null },
        })
        .catch(() => null)
    }
    if (error instanceof ChimmyPECRExecutionError) {
      return NextResponse.json(
        {
          error: error.userMessage,
          message: error.message,
          traceId: error.traceId,
        },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Unable to process Chimmy request.' }, { status: 500 })
  }
}
