import Anthropic from '@anthropic-ai/sdk'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { getInsightBundle, type InsightType } from '@/lib/ai-simulation-integration'
import {
  CHIMMY_DEFAULT_UPGRADE_PATH,
  CHIMMY_PREMIUM_FEATURE_MESSAGE,
} from '@/lib/chimmy-chat/response-copy'
import { buildDevyContextForChimmy } from '@/lib/devy/ai/devyContextForChimmy'
import { buildIdpContextForChimmy } from '@/lib/idp/ai/idpContextForChimmy'
import { buildC2CContextForChimmy } from '@/lib/merged-devy-c2c/ai/c2cContextForChimmy'
import { prisma } from '@/lib/prisma'
import { resolvePlayerStats } from '@/lib/player-comparison-lab/PlayerStatsResolver'
import { DEFAULT_SPORT, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { getLatestSystemHealth } from '@/lib/agents/workers/api-health-monitor'
import {
  buildHashedIdentifier,
  readAgentCache,
  resolveAgentCacheTier,
  writeAgentCache,
  type AgentCacheAddress,
  type AgentCacheTier,
} from '@/lib/agents/cache'
import { buildCompressedSystemPrompt } from '@/lib/agents/prompt-compression'
import { rateLimitManager } from '@/lib/workers/rate-limit-manager'

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? ''

const anthropic = anthropicApiKey
  ? new Anthropic({
      apiKey: anthropicApiKey,
    })
  : null

const MODELS = {
  quickask: process.env.ANTHROPIC_MODEL_QUICKASK?.trim() || 'claude-haiku-4-5-20251001',
  specialist: process.env.ANTHROPIC_MODEL_SPECIALIST?.trim() || 'claude-sonnet-4-6',
  orchestrator: process.env.ANTHROPIC_MODEL_ORCHESTRATOR?.trim() || 'claude-haiku-4-5-20251001',
  deep:
    process.env.ANTHROPIC_MODEL_DEEP?.trim() ||
    process.env.ANTHROPIC_MODEL_OPUS?.trim() ||
    process.env.ANTHROPIC_MODEL_SPECIALIST?.trim() ||
    'claude-sonnet-4-6',
} as const

const TOKEN_LIMITS: Record<IntentType, number> = {
  quick_ask: 200,
  trade_evaluation: 800,
  waiver_wire: 600,
  matchup_simulator: 500,
  player_comparison: 500,
  draft_help: 400,
  power_rankings: 700,
  meta_insights: 500,
  dynasty_legacy: 900,
  bracket: 500,
  storyline: 600,
  general: 300,
}

const PROMPT_DIR_CANDIDATES = [
  path.resolve(process.cwd(), 'lib', 'agents', 'prompts'),
  path.resolve(process.cwd(), 'src', 'lib', 'agents', 'prompts'),
] as const
const promptCache = new Map<string, string>()

const STANDARD_CACHE_TTL_MS = 300_000
const INJURY_CACHE_TTL_MS = 60_000
const AGENT_TIMEOUT_MS = 15_000
const STRUCTURED_CONTEXT_TIMEOUT_MS = 1_200
const TIMEOUT_RESULT_MESSAGE =
  'This response is taking longer than expected. Tap Retry and I will run it again.'

const PROMPTS = {
  chimmy: () => loadPrompt('chimmy_system_prompt.md'),
  trade_evaluation: () => loadPrompt('trade_analyzer_agent_prompt.md'),
  waiver_wire: () => loadPrompt('waiver_wire_agent_prompt.md'),
  draft_help: () => loadPrompt('draft_assistant_agent_prompt.md'),
  draft_lookahead: () => loadPrompt('draft_lookahead_agent_prompt.md'),
  matchup_simulator: () => loadPrompt('matchup_simulator_agent_prompt.md'),
  player_comparison: () => loadPrompt('player_comparison_agent_prompt.md'),
  power_rankings: () => loadPrompt('power_rankings_agent_prompt.md'),
  meta_insights: () => loadPrompt('meta_insights_agent_prompt.md'),
  bracket: () => loadPrompt('bracket_agent_prompt.md'),
  dynasty_legacy: () => loadPrompt('dynasty_legacy_agent_prompt.md'),
  storyline: () => loadPrompt('storyline_agent_prompt.md'),
  orphan_autopilot: () => loadPrompt('orphan_autopilot_agent_prompt.md'),
  live_draft: () => loadPrompt('live_draft_assistant_agent_prompt.md'),
  war_room: () => loadPrompt('war_room_prep_agent_prompt.md'),
} as const

export type Format = 'dynasty' | 'keeper' | 'redraft'
export type Tier = 'free' | 'pro'

export type IntentType =
  | 'trade_evaluation'
  | 'waiver_wire'
  | 'draft_help'
  | 'matchup_simulator'
  | 'player_comparison'
  | 'power_rankings'
  | 'meta_insights'
  | 'bracket'
  | 'dynasty_legacy'
  | 'storyline'
  | 'quick_ask'
  | 'general'

type PromptKey = keyof typeof PROMPTS

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

type ClassifyIntentResult = {
  intent: IntentType
  payload: Record<string, unknown>
  isQuickAsk: boolean
}

export interface UserContext {
  userId: string
  tier: Tier
  sport?: SupportedSport | null
  leagueFormat?: Format | null
  scoring?: string | null
  record?: string | null
  leagueId?: string | null
  insightType?: InsightType | null
  teamId?: string | null
  season?: number | null
  week?: number | null
  source?: string | null
  conversation?: ConversationTurn[]
  memory?: {
    tone?: 'strategic' | 'casual' | 'analytical'
    detailLevel?: 'concise' | 'standard' | 'detailed'
    riskMode?: 'conservative' | 'balanced' | 'aggressive'
  }
  image?: {
    data: string
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    name?: string | null
  } | null
}

export interface AgentResponse {
  result: string
  intent: IntentType
  model: string
  tokensUsed: number
  upgradeRequired?: boolean
  upgradePath?: string
}

const PRO_ONLY: IntentType[] = [
  'trade_evaluation',
  'waiver_wire',
  'draft_help',
  'matchup_simulator',
  'player_comparison',
  'dynasty_legacy',
  'storyline',
]

function isProOnlyIntent(intent: IntentType): boolean {
  return PRO_ONLY.includes(intent)
}

function getSportLabel(sport?: SupportedSport | null): SupportedSport {
  return normalizeToSupportedSport(sport || DEFAULT_SPORT)
}

function buildConversationContext(conversation?: ConversationTurn[]): string {
  if (!Array.isArray(conversation) || conversation.length === 0) return '(none provided)'
  return conversation
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Chimmy'}: ${turn.content}`)
    .join('\n')
}

function sanitizeJsonCandidate(text: string): string {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim()
}

function parseIntentJson(text: string): ClassifyIntentResult | null {
  try {
    const parsed = JSON.parse(sanitizeJsonCandidate(text)) as Partial<ClassifyIntentResult>
    if (!parsed || typeof parsed !== 'object') return null
    const intent = typeof parsed.intent === 'string' ? (parsed.intent as IntentType) : 'general'
    const payload =
      parsed.payload && typeof parsed.payload === 'object' && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {}
    return {
      intent,
      payload,
      isQuickAsk: parsed.isQuickAsk === true,
    }
  } catch {
    return null
  }
}

function compactRecord<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}

function isInjurySensitiveMessage(text: string): boolean {
  return /\b(injury|injured|questionable|doubtful|out|active|inactive|limited|day-to-day|today|tonight)\b/i.test(
    text
  )
}

function getCacheTtlMs(userMessage: string): number {
  return isInjurySensitiveMessage(userMessage) ? INJURY_CACHE_TTL_MS : STANDARD_CACHE_TTL_MS
}

function resolveResponseDataType(intent: IntentType, userMessage: string): string {
  if (isInjurySensitiveMessage(userMessage)) return 'injury'

  switch (intent) {
    case 'power_rankings':
      return 'power_rankings'
    case 'waiver_wire':
      return 'waiver_availability'
    case 'draft_help':
      return 'adp'
    case 'matchup_simulator':
      return 'schedule'
    case 'player_comparison':
      return 'season_stats'
    default:
      return `${intent}_response`
  }
}

function shouldCacheResponse(args: {
  intent: IntentType
  payload: Record<string, unknown>
  ctx: UserContext
  userMessage: string
}): boolean {
  if (args.ctx.leagueId || args.ctx.teamId || args.ctx.image) return false
  if ((args.ctx.conversation?.length ?? 0) > 0) return false
  if (args.ctx.memory) return false
  if (args.ctx.record) return false
  if (args.intent === 'power_rankings' || args.intent === 'matchup_simulator') return false

  return args.userMessage.trim().length > 0 && Object.keys(args.payload).length > 0
}

function buildResponseCacheAddress(args: {
  intent: IntentType
  payload: Record<string, unknown>
  ctx: UserContext
  userMessage: string
}): AgentCacheAddress | null {
  if (!shouldCacheResponse(args)) return null

  const dataType = resolveResponseDataType(args.intent, args.userMessage)
  const tier = resolveAgentCacheTier({ dataType }) as Exclude<AgentCacheTier, 'never'>
  const identifier = buildHashedIdentifier({
    intent: args.intent,
    sport: getSportLabel(args.ctx.sport),
    source: args.ctx.source ?? null,
    userMessage: args.userMessage.trim().toLowerCase(),
    payload: args.payload,
  })

  return {
    tier,
    sport: getSportLabel(args.ctx.sport),
    dataType,
    identifier,
  }
}

async function readCachedResponse(address: AgentCacheAddress | null): Promise<AgentResponse | null> {
  if (!address) return null
  const cached = await readAgentCache<AgentResponse>(address)
  return cached?.value ?? null
}

async function writeCachedResponse(
  address: AgentCacheAddress | null,
  value: AgentResponse,
  ttlMs: number
): Promise<void> {
  if (!address || ttlMs <= 0) return
  await writeAgentCache(address, value, { ttlMs })
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

function buildTimeoutResponse(intent: IntentType, model: string): AgentResponse {
  return {
    result: TIMEOUT_RESULT_MESSAGE,
    intent,
    model,
    tokensUsed: 0,
  }
}

async function applySportsDataDisclaimer(result: string): Promise<string> {
  if (!result.trim()) return result
  const snapshot = await getLatestSystemHealth().catch(() => null)
  const clearSportsStatus = snapshot?.providers?.clearsports?.status
  if (!clearSportsStatus || clearSportsStatus === 'up') return result

  const disclaimer = 'Using cached data — live sports feeds temporarily unavailable.'
  return result.startsWith(disclaimer) ? result : `${disclaimer}\n\n${result}`
}

function countNamedAssets(payload: Record<string, unknown>): number {
  const keys = ['team_a_assets', 'team_b_assets', 'players', 'assets', 'candidatePlayers', 'queueEntries']
  return keys.reduce((count, key) => {
    const value = payload[key]
    if (Array.isArray(value)) return count + value.length
    return count
  }, 0)
}

function getActiveFormats(structuredFantasyContext: StructuredFantasyContext, ctx: UserContext): string[] {
  const league = asRecord(asRecord(structuredFantasyContext).league)
  const formats = Array.isArray(league.activeFormatTypes)
    ? league.activeFormatTypes.map((value) => String(value).toLowerCase())
    : []

  if (formats.length > 0) return formats
  return [String(ctx.leagueFormat ?? 'redraft').toLowerCase()]
}

function buildRuntimeSystemPrompt(
  rawPrompt: string,
  ctx: UserContext,
  structuredFantasyContext?: StructuredFantasyContext
): string {
  return buildCompressedSystemPrompt({
    rawPrompt,
    structuredFantasyContext,
    ctx: {
      sport: getSportLabel(ctx.sport),
      leagueFormat: ctx.leagueFormat ?? null,
      scoring: ctx.scoring ?? null,
      record: ctx.record ?? null,
      leagueId: ctx.leagueId ?? null,
      teamId: ctx.teamId ?? null,
    },
  })
}

function isSimpleQuery(intent: IntentType, payload: Record<string, unknown>, userMessage: string): boolean {
  const words = userMessage.trim().split(/\s+/).filter(Boolean).length
  return intent === 'quick_ask' || intent === 'general' || (words <= 10 && countNamedAssets(payload) <= 1)
}

function isDynastyComplex(
  intent: IntentType,
  payload: Record<string, unknown>,
  userMessage: string,
  structuredFantasyContext: StructuredFantasyContext,
  ctx: UserContext
): boolean {
  const lower = userMessage.toLowerCase()
  const activeFormats = getActiveFormats(structuredFantasyContext, ctx)
  const dynastyLike = activeFormats.includes('dynasty') || intent === 'dynasty_legacy'
  const multiAsset = countNamedAssets(payload) >= 4

  return (
    intent === 'storyline' ||
    intent === 'dynasty_legacy' ||
    (dynastyLike && multiAsset) ||
    (dynastyLike && /\b(3 year|5 year|long term|future value|rebuild|contend window)\b/.test(lower))
  )
}

function selectModel(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext,
  userMessage: string,
  structuredFantasyContext: StructuredFantasyContext
): string {
  if (isSimpleQuery(intent, payload, userMessage)) return MODELS.quickask
  if (isDynastyComplex(intent, payload, userMessage, structuredFantasyContext, ctx)) return MODELS.deep
  return MODELS.specialist
}

async function loadPrompt(fileName: string): Promise<string> {
  if (promptCache.has(fileName)) {
    return promptCache.get(fileName) as string
  }

  const filePaths = PROMPT_DIR_CANDIDATES.map((dir) => path.join(dir, fileName))
  let lastError: unknown = null

  for (const filePath of filePaths) {
    try {
      const text = await fs.readFile(filePath, 'utf8')
      const normalized = text.trim()
      promptCache.set(fileName, normalized)
      return normalized
    } catch (error) {
      lastError = error
      const details =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error
      console.error('[anthropic-pipeline] Failed to read prompt file:', {
        fileName,
        filePath,
        cwd: process.cwd(),
        error: details,
      })
    }
  }

  const attemptedPaths = filePaths.join(', ')
  throw new Error(
    `Unable to load prompt file "${fileName}". Attempted paths: ${attemptedPaths}. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  )
}

type ClaudeCallResult = {
  text: string
  tokensUsed: number
  model: string
}

type SportsContextResult = {
  summary: string
  sources: string[]
  sport?: SupportedSport | null
} | null

type StructuredFantasyContext = Record<string, unknown> | null

function buildAnthropicUserContent(userMessage: string, image?: UserContext['image']) {
  const normalizedMessage =
    userMessage.trim() || 'Analyze the uploaded fantasy sports image and explain the key takeaways.'

  if (!image) {
    return normalizedMessage
  }

  return [
    { type: 'text' as const, text: normalizedMessage },
    {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: image.mediaType,
        data: image.data,
      },
    },
  ]
}

export function isAnthropicPipelineAvailable(): boolean {
  return Boolean(anthropic)
}

async function callClaude(args: {
  system: string
  userMessage: string
  model: string
  maxTokens?: number
  image?: UserContext['image']
}): Promise<ClaudeCallResult> {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured.')
  }

  if (!(await rateLimitManager.canCall('anthropic', '/v1/messages'))) {
    throw new Error('Anthropic safety rate limit reached. Retry shortly.')
  }

  const startedAt = Date.now()
  try {
    const response = await anthropic.messages.create({
      model: args.model,
      max_tokens: args.maxTokens ?? 1500,
      system: args.system,
      messages: [{ role: 'user', content: buildAnthropicUserContent(args.userMessage, args.image) }],
    })
    await rateLimitManager.recordCall('anthropic', '/v1/messages', 200, Date.now() - startedAt)

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model || args.model,
    }
  } catch (error: unknown) {
    await rateLimitManager.recordCall(
      'anthropic',
      '/v1/messages',
      error instanceof Anthropic.APIError && typeof error.status === 'number' ? error.status : 500,
      Date.now() - startedAt,
      { error: error instanceof Error ? error.message : String(error) }
    )
    if (error instanceof Anthropic.APIError) {
      if (error.status === 529) {
        throw new Error('AI temporarily overloaded. Try again in a moment.')
      }
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key. Check ANTHROPIC_API_KEY.')
      }
      if (error.status === 429) {
        throw new Error('Anthropic rate limit hit. Check usage limits and retry soon.')
      }
    }
    throw error
  }
}

async function callClaudeStream(args: {
  system: string
  userMessage: string
  model: string
  maxTokens?: number
  onText: (delta: string, snapshot: string) => void
  image?: UserContext['image']
}): Promise<ClaudeCallResult> {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured.')
  }

  if (!(await rateLimitManager.canCall('anthropic', '/v1/messages'))) {
    throw new Error('Anthropic safety rate limit reached. Retry shortly.')
  }

  const startedAt = Date.now()
  try {
    const stream = anthropic.messages.stream({
      model: args.model,
      max_tokens: args.maxTokens ?? 1500,
      system: args.system,
      messages: [{ role: 'user', content: buildAnthropicUserContent(args.userMessage, args.image) }],
    })

    let latestSnapshot = ''
    stream.on('text', (delta, snapshot) => {
      latestSnapshot = snapshot
      args.onText(delta, snapshot)
    })

    const [finalText, finalMessage] = await Promise.all([
      stream.finalText(),
      stream.finalMessage(),
    ])
    await rateLimitManager.recordCall('anthropic', '/v1/messages', 200, Date.now() - startedAt)

    return {
      text: finalText?.trim() || latestSnapshot.trim(),
      tokensUsed:
        Math.max(0, finalMessage.usage.input_tokens ?? 0) +
        Math.max(0, finalMessage.usage.output_tokens ?? 0),
      model: finalMessage.model || args.model,
    }
  } catch (error: unknown) {
    await rateLimitManager.recordCall(
      'anthropic',
      '/v1/messages',
      error instanceof Anthropic.APIError && typeof error.status === 'number' ? error.status : 500,
      Date.now() - startedAt,
      { error: error instanceof Error ? error.message : String(error) }
    )
    if (error instanceof Anthropic.APIError) {
      if (error.status === 529) {
        throw new Error('AI temporarily overloaded. Try again in a moment.')
      }
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key. Check ANTHROPIC_API_KEY.')
      }
      if (error.status === 429) {
        throw new Error('Anthropic rate limit hit. Check usage limits and retry soon.')
      }
    }
    throw error
  }
}

async function classifyIntent(
  userMessage: string,
  ctx: UserContext
): Promise<{ result: ClassifyIntentResult; tokensUsed: number }> {
  const systemPrompt = await PROMPTS.chimmy()
  const prompt = [
    '## USER CONTEXT',
    `- Tier: ${ctx.tier}`,
    `- Sport: ${getSportLabel(ctx.sport)}`,
    `- Format: ${ctx.leagueFormat ?? 'redraft'}`,
    `- Scoring: ${ctx.scoring ?? 'PPR'}`,
    `- Record: ${ctx.record ?? 'unknown'}`,
    `- Tone: ${ctx.memory?.tone ?? 'strategic'}`,
    `- Detail level: ${ctx.memory?.detailLevel ?? 'concise'}`,
    `- Risk mode: ${ctx.memory?.riskMode ?? 'balanced'}`,
    `- League ID: ${ctx.leagueId ?? 'none'}`,
    `- Source: ${ctx.source ?? 'unknown'}`,
    `- Image attached: ${ctx.image ? 'yes' : 'no'}`,
    '',
    '## RECENT CONVERSATION',
    buildConversationContext(ctx.conversation),
    '',
    '## USER MESSAGE',
    userMessage || '(no text message provided)',
    ctx.image
      ? '\n## IMAGE CONTEXT\nA fantasy sports image is attached. Use what is visible in the image to help classify intent.'
      : '',
    '',
    '## YOUR TASK',
    'Classify this message. Valid intents:',
    'trade_evaluation | waiver_wire | draft_help | matchup_simulator |',
    'player_comparison | power_rankings | meta_insights | bracket | dynasty_legacy |',
    'storyline | quick_ask | general',
    '',
    'Choose intents using these rules:',
    '- Use meta_insights for platform-wide or sport-wide trends, momentum, market behavior, or "what is changing right now" questions.',
    '- Use power_rankings for ranking teams within a specific league, explaining movers, or generating standings-style ordering.',
    '- Use storyline for recaps, narratives, social-style writeups, matchup previews with editorial tone, or league storytelling requests.',
    '- Use general only when the request does not clearly fit any specialist intent.',
    '',
    'Respond ONLY with valid JSON and no markdown fences:',
    '{',
    '  "intent": "trade_evaluation",',
    '  "isQuickAsk": false,',
    '  "payload": {',
    '    "sport": "NFL",',
    '    "format": "dynasty",',
    '    "scoring": "PPR",',
    '    "userMessage": "original message here"',
    '  }',
    '}',
  ].join('\n')

  const result = await callClaude({
    system: systemPrompt,
    userMessage: prompt,
    model: MODELS.orchestrator,
    maxTokens: 200,
    image: ctx.image,
  })

  const parsed = parseIntentJson(result.text) ?? {
    intent: 'general' as const,
    payload: { userMessage },
    isQuickAsk: false,
  }

  return { result: parsed, tokensUsed: result.tokensUsed }
}

function inferInsightTypeForSportsContext(userMessage: string, ctx: UserContext): InsightType | null {
  if (ctx.insightType) return ctx.insightType

  const source = String(ctx.source ?? '').toLowerCase()
  if (source.includes('draft')) return 'draft'
  if (source.includes('waiver')) return 'waiver'
  if (source.includes('matchup')) return 'matchup'
  if (source.includes('trade')) return 'trade'

  const lowerMessage = userMessage.toLowerCase()
  if (/waiver|pickup|faab|free agent|drop\b/.test(lowerMessage)) return 'waiver'
  if (/draft|adp|pick\b|round\b|rookie/.test(lowerMessage)) return 'draft'
  if (/matchup|start\/sit|start sit|lineup|bench/.test(lowerMessage)) return 'matchup'
  if (/playoff|seed|odds|schedule/.test(lowerMessage)) return 'playoff'
  if (/dynasty|rebuild|future|keeper/.test(lowerMessage)) return 'dynasty'
  if (/trade|offer|counter|sell high|buy low/.test(lowerMessage)) return 'trade'

  return null
}

async function fetchSportsContext(
  userMessage: string,
  ctx: UserContext
): Promise<SportsContextResult> {
  if (!ctx.leagueId) return null

  const insightType = inferInsightTypeForSportsContext(userMessage, ctx)
  if (!insightType) return null

  try {
    const bundle = await getInsightBundle(ctx.leagueId, insightType, {
      teamId: ctx.teamId ?? undefined,
      season: ctx.season ?? undefined,
      week: ctx.week ?? undefined,
      sport: ctx.sport ?? undefined,
    })

    if (!bundle.contextText?.trim()) return null

    return {
      summary: bundle.contextText.trim(),
      sources: bundle.sources,
      sport: bundle.sport,
    }
  } catch (error) {
    console.error('[anthropic-pipeline] Sports context fetch failed:', {
      userId: ctx.userId,
      leagueId: ctx.leagueId,
      insightType,
      error: error instanceof Error ? error.message : error,
    })
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function readNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
  }
  return null
}

function toOrdinal(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`
  const mod10 = value % 10
  if (mod10 === 1) return `${value}st`
  if (mod10 === 2) return `${value}nd`
  if (mod10 === 3) return `${value}rd`
  return `${value}th`
}

function extractPlayerIds(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const candidate = record.id ?? record.player_id ?? record.playerId
      return typeof candidate === 'string' ? candidate : null
    })
    .filter((entry): entry is string => Boolean(entry))
}

function normalizeRosterSections(playerData: unknown): {
  players: string[]
  starters: string[]
  bench: string[]
  ir: string[]
  taxi: string[]
} {
  if (Array.isArray(playerData)) {
    return {
      players: getRosterPlayerIds(playerData),
      starters: [],
      bench: getRosterPlayerIds(playerData),
      ir: [],
      taxi: [],
    }
  }

  const record = asRecord(playerData)
  const players = getRosterPlayerIds(playerData)
  const starters = extractPlayerIds(record.starters)
  const ir = extractPlayerIds(record.ir)
  const taxi = extractPlayerIds(record.taxi)
  const explicitBench = extractPlayerIds(record.bench)
  const bench =
    explicitBench.length > 0
      ? explicitBench
      : players.filter(
          (playerId) =>
            !starters.includes(playerId) && !ir.includes(playerId) && !taxi.includes(playerId)
        )

  return { players, starters, bench, ir, taxi }
}

async function resolvePlayerNamesById(
  playerIds: string[],
  sport: SupportedSport
): Promise<Map<string, { name: string; position: string | null }>> {
  const uniqueIds = [...new Set(playerIds.filter(Boolean))]
  const map = new Map<string, { name: string; position: string | null }>()
  if (uniqueIds.length === 0) return map

  const identityRows = await prisma.playerIdentityMap.findMany({
    where: {
      sport,
      sleeperId: { in: uniqueIds },
    },
    select: {
      sleeperId: true,
      canonicalName: true,
      position: true,
    },
  })

  for (const row of identityRows) {
    if (!row.sleeperId) continue
    map.set(row.sleeperId, {
      name: row.canonicalName,
      position: row.position ?? null,
    })
  }

  for (const playerId of uniqueIds) {
    if (!map.has(playerId)) {
      map.set(playerId, { name: playerId, position: null })
    }
  }

  return map
}

function summarizeRosterNames(
  ids: string[],
  nameMap: Map<string, { name: string; position: string | null }>
): string[] {
  return ids.map((playerId) => nameMap.get(playerId)?.name ?? playerId)
}

function countStarterSlots(starters: unknown): Record<string, number> {
  if (Array.isArray(starters)) {
    return starters.reduce<Record<string, number>>((acc, slot) => {
      const key = typeof slot === 'string' ? slot.toUpperCase() : ''
      if (!key) return acc
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  }

  const record = asRecord(starters)
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([key, value]) => [key.toUpperCase(), Number(value)])
  )
}

function inferScoringLabel(
  leagueScoring: string | null | undefined,
  settings: Record<string, unknown>,
  ctx: UserContext
): string {
  return (
    ctx.scoring ??
    leagueScoring ??
    readString(settings, ['scoring_format', 'scoringFormat', 'league_scoring_label']) ??
    'PPR'
  )
}

function buildLeagueScoringSettings(
  settings: Record<string, unknown>,
  starterSlots: Record<string, number>
): {
  ppr?: number | null
  tePremium?: number | null
  superflex?: boolean | null
  passTdPoints?: number | null
} {
  const ppr = readNumber(settings, ['ppr', 'points_per_reception'])
  const tePremium = readNumber(settings, ['te_premium', 'tePremium'])
  const passTdPoints = readNumber(settings, ['pass_td_points', 'passTdPoints'])
  const superflex =
    readBoolean(settings, ['superflex', 'is_superflex']) ??
    Boolean(starterSlots['SUPER_FLEX'] || starterSlots['SFLEX'] || starterSlots['OP'])

  return compactRecord({
    ppr,
    tePremium,
    superflex,
    passTdPoints,
  })
}

function inferActiveFormatTypes(args: {
  leagueFormat: string | null
  leagueVariant: string | null
  isDynasty: boolean
  scoringLabel: string
  starterSlots: Record<string, number>
  settings: Record<string, unknown>
  hasGuillotine: boolean
  hasSalaryCap: boolean
  hasSurvivor: boolean
  hasZombie: boolean
  hasDevy: boolean
  hasC2c: boolean
  hasBigBrother: boolean
  hasIdp: boolean
  hasBestBall: boolean
}): string[] {
  const formats = new Set<string>()
  const lowerFormat = String(args.leagueFormat ?? '').toLowerCase()
  const lowerVariant = String(args.leagueVariant ?? '').toLowerCase()

  if (lowerFormat.includes('keeper') || lowerVariant.includes('keeper')) formats.add('keeper')
  else if (args.isDynasty || lowerFormat.includes('dynasty') || lowerVariant.includes('dynasty'))
    formats.add('dynasty')
  else formats.add('redraft')

  if (args.hasBestBall || lowerVariant.includes('bestball') || lowerVariant.includes('best_ball')) {
    formats.add('best_ball')
  }
  if (args.hasGuillotine || lowerVariant.includes('guillotine')) formats.add('guillotine')
  if (args.hasSalaryCap || lowerVariant.includes('salary')) formats.add('salary_cap')
  if (args.hasSurvivor || lowerVariant.includes('survivor')) formats.add('survivor')
  if (args.hasZombie || lowerVariant.includes('zombie')) formats.add('zombie')
  if (args.hasDevy || lowerVariant.includes('devy')) formats.add('devy')
  if (args.hasC2c || lowerVariant.includes('c2c')) formats.add('c2c')
  if (args.hasBigBrother || lowerVariant.includes('big_brother')) formats.add('big_brother')
  if (args.hasIdp || lowerVariant.includes('idp')) formats.add('idp')
  if (
    Boolean(args.starterSlots['SUPER_FLEX'] || args.starterSlots['SFLEX'] || args.starterSlots['OP']) ||
    readBoolean(args.settings, ['superflex', 'is_superflex']) ||
    lowerVariant.includes('superflex')
  ) {
    formats.add('superflex')
  }

  const scoringLower = args.scoringLabel.toLowerCase()
  if (scoringLower.includes('half')) formats.add('half_ppr')
  else if (scoringLower.includes('standard')) formats.add('standard')
  else if (scoringLower.includes('category')) formats.add('categories')
  else if (scoringLower.includes('points')) formats.add('points')
  else formats.add('ppr')

  if (readNumber(args.settings, ['te_premium', 'tePremium']) && readNumber(args.settings, ['te_premium', 'tePremium'])! > 0) {
    formats.add('te_premium')
  }

  return [...formats]
}

function buildTradeDeadlineStatus(currentWeek: number | null, deadlineWeek: number | null) {
  if (!deadlineWeek) return null
  if (!currentWeek) return `Trade deadline week ${deadlineWeek}`
  return currentWeek <= deadlineWeek
    ? `Open through week ${deadlineWeek}`
    : `Closed after week ${deadlineWeek}`
}

function extractCandidateNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}\b/g) ?? []
  const blocked = new Set([
    'I',
    'My',
    'Who',
    'What',
    'Why',
    'Should',
    'Start',
    'Sit',
    'Trade',
    'Add',
    'Drop',
    'Bench',
    'Waiver',
    'Wire',
    'Week',
    'Round',
    'Pick',
    'League',
    'Dynasty',
    'Redraft',
    'Keeper',
    'Best Ball',
    'Superflex',
  ])

  return matches
    .map((candidate) => candidate.trim())
    .filter((candidate) => !blocked.has(candidate))
}

function collectPayloadStrings(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === 'string') {
    bucket.push(value)
    return bucket
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPayloadStrings(item, bucket)
    return bucket
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectPayloadStrings(entry, bucket)
    }
  }
  return bucket
}

function extractMentionedPlayerNames(
  userMessage: string,
  payload: Record<string, unknown>
): string[] {
  const candidates = new Set<string>()
  for (const text of [userMessage, ...collectPayloadStrings(payload)]) {
    for (const name of extractCandidateNames(text)) {
      candidates.add(name)
    }
  }
  return [...candidates].slice(0, 6)
}

async function resolvePlayerRecordId(playerName: string, sport: SupportedSport): Promise<string | null> {
  const exactSeasonRow = await prisma.playerSeasonStats.findFirst({
    where: {
      sport,
      playerName: { equals: playerName, mode: 'insensitive' },
    },
    orderBy: [{ season: 'desc' }],
    select: { playerId: true },
  })
  if (exactSeasonRow?.playerId) return exactSeasonRow.playerId

  const fuzzySeasonRow = await prisma.playerSeasonStats.findFirst({
    where: {
      sport,
      playerName: { contains: playerName, mode: 'insensitive' },
    },
    orderBy: [{ season: 'desc' }],
    select: { playerId: true },
  })
  if (fuzzySeasonRow?.playerId) return fuzzySeasonRow.playerId

  const injuryRow = await prisma.sportsInjury.findFirst({
    where: {
      sport,
      playerName: { contains: playerName, mode: 'insensitive' },
    },
    orderBy: [{ updatedAt: 'desc' }],
    select: { playerId: true },
  })

  return injuryRow?.playerId ?? null
}

function summarizeScheduleDifficulty(score: number | null): string | null {
  if (score == null) return null
  if (score <= 20) return 'very favorable'
  if (score <= 24) return 'favorable'
  if (score <= 28) return 'neutral'
  if (score <= 32) return 'tough'
  return 'very tough'
}

function summarizeRoleSecurity(input: {
  lineupStartRate?: number | null
  trendScore?: number | null
  trendingDirection?: string | null
}): string | null {
  const startRate = input.lineupStartRate ?? null
  const trendDirection = String(input.trendingDirection ?? '').toLowerCase()
  if (startRate != null && startRate >= 0.8) return 'locked-in starter'
  if (startRate != null && startRate >= 0.55) return 'stable weekly starter'
  if (trendDirection === 'rising' || trendDirection === 'hot') return 'role trending up'
  if (trendDirection === 'cold' || trendDirection === 'falling') return 'role pressure rising'
  if (input.trendScore != null && input.trendScore > 0.6) return 'usage holding strong'
  return null
}

function isPlayerMovementIntent(intent: IntentType, userMessage: string): boolean {
  if (
    ['trade_evaluation', 'waiver_wire', 'matchup_simulator', 'player_comparison', 'draft_help', 'dynasty_legacy'].includes(
      intent
    )
  ) {
    return true
  }

  return /\b(trade|waiver|add|drop|claim|start|sit|bench|keeper|draft|pick|compare)\b/i.test(
    userMessage
  )
}

async function buildPlayerContextMap(
  playerNames: string[],
  sport: SupportedSport,
  leagueScoringSettings: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    playerNames.map(async (playerName) => {
      const playerStats = await resolvePlayerStats(playerName, {
        sport,
        leagueScoringSettings,
      }).catch(() => null)
      if (!playerStats) return null

      const playerId = await resolvePlayerRecordId(playerName, sport).catch(() => null)
      const [injuryHistory, last3Games, trendRow, newsRows] = await Promise.all([
        prisma.sportsInjury.findMany({
          where: {
            sport,
            playerName: { contains: playerName, mode: 'insensitive' },
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: 3,
          select: {
            status: true,
            type: true,
            updatedAt: true,
          },
        }),
        playerId
          ? prisma.playerGameFact.findMany({
              where: {
                sport,
                playerId,
              },
              orderBy: [{ season: 'desc' }, { weekOrRound: 'desc' }, { createdAt: 'desc' }],
              take: 3,
              select: {
                fantasyPoints: true,
                weekOrRound: true,
              },
            })
          : Promise.resolve([]),
        playerId
          ? prisma.playerMetaTrend.findFirst({
              where: {
                sport,
                playerId,
              },
              select: {
                trendScore: true,
                trendingDirection: true,
                lineupStartRate: true,
                tradeInterest: true,
              },
            })
          : Promise.resolve(null),
        prisma.sportsNews.findMany({
          where: {
            sport,
            OR: [
              { playerName: { contains: playerName, mode: 'insensitive' } },
              { playerNames: { has: playerName } },
            ],
          },
          orderBy: [{ publishedAt: 'desc' }],
          take: 2,
          select: {
            title: true,
            publishedAt: true,
          },
        }),
      ])

      const injuryStatus =
        playerStats.injury.status ??
        injuryHistory[0]?.status ??
        'unknown'

      return [
        playerName,
        compactRecord({
          injuryStatus,
          injuryHistory: injuryHistory.map((row) =>
            compactRecord({
              status: row.status,
              type: row.type,
              updatedAt: row.updatedAt.toISOString(),
            })
          ),
          last3Games: last3Games.map((row) => Number(row.fantasyPoints.toFixed(1))),
          rosSchedule: summarizeScheduleDifficulty(playerStats.scheduleDifficultyScore),
          role: summarizeRoleSecurity({
            lineupStartRate: trendRow?.lineupStartRate ?? undefined,
            trendScore: trendRow?.trendScore ?? undefined,
            trendingDirection: trendRow?.trendingDirection ?? undefined,
          }),
          position: playerStats.position,
          team: playerStats.team,
          projection: playerStats.internalProjectionPoints,
          trendDirection: trendRow?.trendingDirection ?? null,
          usageTrend:
            trendRow?.lineupStartRate != null
              ? `${Math.round(trendRow.lineupStartRate * 100)}% lineup start rate`
              : null,
          realLifeTeamSituation:
            newsRows.length > 0 ? newsRows.map((row) => row.title).join(' | ') : null,
          byeWeek: null,
        }),
      ] as const
    })
  )

  return entries.reduce<Record<string, unknown>>((acc, entry) => {
    if (!entry) return acc
    const [playerName, details] = entry
    acc[playerName] = details
    return acc
  }, {})
}

async function buildStructuredFantasyContext(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext
): Promise<StructuredFantasyContext> {
  const sport = getSportLabel(ctx.sport)
  const playerNames = extractMentionedPlayerNames(
    String(payload.userMessage ?? payload.message ?? ''),
    payload
  )

  if (!ctx.leagueId && playerNames.length === 0) {
    return null
  }

  const playerContextPromise = withTimeout(
    buildPlayerContextMap(playerNames, sport, {}),
    STRUCTURED_CONTEXT_TIMEOUT_MS,
    'Player context timed out.'
  ).catch(() => ({}))

  if (!ctx.leagueId) {
    const players = await playerContextPromise
    return Object.keys(players).length > 0 ? { players } : null
  }

  const [league, rosters, teams] = await Promise.all([
    prisma.league.findUnique({
      where: { id: ctx.leagueId },
      select: {
        id: true,
        name: true,
        sport: true,
        leagueVariant: true,
        season: true,
        leagueSize: true,
        scoring: true,
        isDynasty: true,
        rosterSize: true,
        starters: true,
        settings: true,
        waiverSettings: {
          select: {
            waiverType: true,
            faabBudget: true,
          },
        },
        guillotineConfig: { select: { id: true } },
        salaryCapConfig: { select: { id: true, mode: true } },
        survivorConfig: { select: { id: true, mode: true } },
        zombieConfig: { select: { id: true } },
        devyConfig: { select: { id: true, bestBallEnabled: true } },
        c2cConfig: { select: { id: true, bestBallPro: true, bestBallCollege: true } },
        bigBrotherConfig: { select: { id: true } },
        idpConfig: {
          select: {
            id: true,
            bestBallEnabled: true,
            benchSlots: true,
            irSlots: true,
          },
        },
        dynastyConfig: {
          select: {
            tradeDeadlineWeek: true,
            taxiSlots: true,
          },
        },
      },
    }),
    prisma.roster.findMany({
      where: { leagueId: ctx.leagueId },
      select: {
        id: true,
        platformUserId: true,
        playerData: true,
        faabRemaining: true,
        waiverPriority: true,
      },
    }),
    prisma.leagueTeam.findMany({
      where: { leagueId: ctx.leagueId },
      select: {
        id: true,
        externalId: true,
        ownerName: true,
        teamName: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        currentRank: true,
        projectedWins: true,
        strengthNotes: true,
        riskNotes: true,
      },
      orderBy: [{ currentRank: 'asc' }, { pointsFor: 'desc' }],
    }),
  ])

  if (!league) {
    const players = await playerContextPromise
    return Object.keys(players).length > 0 ? { players } : null
  }

  const settings = asRecord(league.settings)
  const starterSlots = countStarterSlots(league.starters)
  const scoringLabel = inferScoringLabel(league.scoring, settings, ctx)
  const leagueScoringSettings = buildLeagueScoringSettings(settings, starterSlots)
  const currentWeek = ctx.week ?? readNumber(settings, ['current_week', 'currentWeek'])
  const activeFormatTypes = inferActiveFormatTypes({
    leagueFormat:
      ctx.leagueFormat ??
      readString(settings, ['league_type', 'leagueType']) ??
      (league.isDynasty ? 'dynasty' : 'redraft'),
    leagueVariant: league.leagueVariant,
    isDynasty: league.isDynasty,
    scoringLabel,
    starterSlots,
    settings,
    hasGuillotine: Boolean(league.guillotineConfig),
    hasSalaryCap: Boolean(league.salaryCapConfig),
    hasSurvivor: Boolean(league.survivorConfig),
    hasZombie: Boolean(league.zombieConfig),
    hasDevy: Boolean(league.devyConfig),
    hasC2c: Boolean(league.c2cConfig),
    hasBigBrother: Boolean(league.bigBrotherConfig),
    hasIdp: Boolean(league.idpConfig),
    hasBestBall:
      Boolean(league.devyConfig?.bestBallEnabled) ||
      Boolean(league.c2cConfig?.bestBallCollege || league.c2cConfig?.bestBallPro) ||
      Boolean(league.idpConfig?.bestBallEnabled) ||
      Boolean(readBoolean(settings, ['best_ball', 'bestBallEnabled'])),
  })

  const teamByExternalId = new Map(teams.map((team) => [team.externalId, team]))
  const rosterByExternalId = new Map(rosters.flatMap((roster) => [[roster.id, roster], [roster.platformUserId, roster]]))
  const userRoster =
    rosters.find((roster) => roster.platformUserId === ctx.userId) ??
    (ctx.teamId ? rosters.find((roster) => roster.id === ctx.teamId) : null) ??
    null
  const userTeam =
    (userRoster
      ? teamByExternalId.get(userRoster.id) ?? teamByExternalId.get(userRoster.platformUserId)
      : null) ?? null

  const userRosterSections = normalizeRosterSections(userRoster?.playerData ?? null)
  const userPlayerNameMap = await resolvePlayerNamesById(userRosterSections.players, sport).catch(
    () => new Map<string, { name: string; position: string | null }>()
  )
  const players = await withTimeout(
    buildPlayerContextMap(playerNames, sport, leagueScoringSettings),
    STRUCTURED_CONTEXT_TIMEOUT_MS,
    'Player context timed out.'
  ).catch(() => ({}))

  const [seasonProjection, matchupFact, matchupProjection, idpNote, devyNote, c2cNote] =
    await Promise.all([
      userTeam && league.season
        ? prisma.seasonSimulationResult.findFirst({
            where: {
              leagueId: ctx.leagueId,
              season: league.season,
              teamId: userTeam.id,
            },
            orderBy: [{ weekOrPeriod: 'desc' }],
            select: {
              playoffProbability: true,
              championshipProbability: true,
              expectedRank: true,
            },
          })
        : Promise.resolve(null),
      userTeam && currentWeek != null
        ? prisma.matchupFact.findFirst({
            where: {
              leagueId: ctx.leagueId,
              weekOrPeriod: currentWeek,
              OR: [{ teamA: userTeam.id }, { teamB: userTeam.id }],
            },
            orderBy: [{ season: 'desc' }],
            select: {
              teamA: true,
              teamB: true,
              scoreA: true,
              scoreB: true,
            },
          })
        : Promise.resolve(null),
      userTeam && currentWeek != null
        ? prisma.matchupSimulationResult.findFirst({
            where: {
              leagueId: ctx.leagueId,
              weekOrPeriod: currentWeek,
              OR: [{ teamAId: userTeam.id }, { teamBId: userTeam.id }],
            },
            orderBy: [{ createdAt: 'desc' }],
            select: {
              teamAId: true,
              teamBId: true,
              expectedScoreA: true,
              expectedScoreB: true,
              winProbabilityA: true,
              winProbabilityB: true,
            },
          })
        : Promise.resolve(null),
      league.idpConfig ? buildIdpContextForChimmy(ctx.leagueId, ctx.userId).catch(() => '') : Promise.resolve(''),
      league.devyConfig ? buildDevyContextForChimmy(ctx.leagueId, ctx.userId).catch(() => '') : Promise.resolve(''),
      league.c2cConfig ? buildC2CContextForChimmy(ctx.leagueId, ctx.userId).catch(() => '') : Promise.resolve(''),
    ])

  const opponentTeamId =
    matchupFact && userTeam
      ? matchupFact.teamA === userTeam.id
        ? matchupFact.teamB
        : matchupFact.teamA
      : null
  const opponentTeam = opponentTeamId ? teams.find((team) => team.id === opponentTeamId) ?? null : null
  const opponentRoster =
    opponentTeam ? rosterByExternalId.get(opponentTeam.externalId) ?? null : null
  const opponentRosterSections = normalizeRosterSections(opponentRoster?.playerData ?? null)
  const opponentNameMap = await resolvePlayerNamesById(
    opponentRosterSections.players.slice(0, 30),
    sport
  ).catch(() => new Map<string, { name: string; position: string | null }>())
  const matchupHistory =
    userTeam && opponentTeam
      ? await prisma.matchupFact.findMany({
          where: {
            leagueId: ctx.leagueId,
            OR: [
              { teamA: userTeam.id, teamB: opponentTeam.id },
              { teamA: opponentTeam.id, teamB: userTeam.id },
            ],
          },
          orderBy: [{ season: 'desc' }, { weekOrPeriod: 'desc' }],
          take: 3,
          select: {
            weekOrPeriod: true,
            scoreA: true,
            scoreB: true,
            teamA: true,
            teamB: true,
          },
        }).catch(() => [])
      : []

  const tradeDeadlineWeek =
    league.dynastyConfig?.tradeDeadlineWeek ??
    readNumber(settings, ['trade_deadline_week', 'tradeDeadlineWeek'])
  const waiverType =
    league.waiverSettings?.waiverType ??
    readString(settings, ['waiver_type', 'waiverType']) ??
    (league.waiverSettings?.faabBudget ? 'faab' : null)
  const benchSize =
    readNumber(settings, ['bench_size', 'benchSize']) ??
    league.idpConfig?.benchSlots ??
    Math.max((league.rosterSize ?? 0) - Object.values(starterSlots).reduce((sum, count) => sum + count, 0), 0)
  const irSlots =
    readNumber(settings, ['ir_slots', 'IR_slots', 'irSlots']) ?? league.idpConfig?.irSlots ?? null
  const taxiSlots =
    league.dynastyConfig?.taxiSlots ??
    readNumber(settings, ['taxi_slots', 'taxiSlots']) ??
    null

  const playoffPosition =
    userTeam != null
      ? [
          toOrdinal(userTeam.currentRank),
          seasonProjection?.playoffProbability != null
            ? `${Math.round(seasonProjection.playoffProbability * 100)}% playoff odds`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null

  return compactRecord({
    league: compactRecord({
      id: league.id,
      name: league.name ?? null,
      sport,
      format: activeFormatTypes[0] ?? null,
      activeFormatTypes,
      scoring: scoringLabel,
      scoringSettings: leagueScoringSettings,
      rosterConstruction: compactRecord({
        starterSlots,
        benchSlots: benchSize,
        irSlots,
        taxiSlots,
      }),
      leagueSize: league.leagueSize ?? null,
      tradeDeadlineStatus: buildTradeDeadlineStatus(currentWeek, tradeDeadlineWeek),
      waiverType,
      currentWeek,
      playoffPicture: playoffPosition,
    }),
    userRoster: compactRecord({
      rosterId: userRoster?.id ?? null,
      teamName: userTeam?.teamName ?? userTeam?.ownerName ?? null,
      starters: summarizeRosterNames(userRosterSections.starters, userPlayerNameMap),
      bench: summarizeRosterNames(userRosterSections.bench, userPlayerNameMap),
      ir: summarizeRosterNames(userRosterSections.ir, userPlayerNameMap),
      taxi: summarizeRosterNames(userRosterSections.taxi, userPlayerNameMap),
      strengths:
        userTeam?.strengthNotes
          ?.split(/[.;]/)
          .map((value) => value.trim())
          .filter(Boolean) ?? [],
      weaknesses:
        userTeam?.riskNotes
          ?.split(/[.;]/)
          .map((value) => value.trim())
          .filter(Boolean) ?? [],
    }),
    userRecord:
      userTeam != null
        ? `${userTeam.wins}-${userTeam.losses}${userTeam.ties ? `-${userTeam.ties}` : ''}`
        : ctx.record ?? null,
    faabRemaining: userRoster?.faabRemaining ?? null,
    waiverPriority: userRoster?.waiverPriority ?? null,
    playoffPosition,
    opponent: opponentTeam
      ? compactRecord({
          teamName: opponentTeam.teamName ?? opponentTeam.ownerName,
          record: `${opponentTeam.wins}-${opponentTeam.losses}${opponentTeam.ties ? `-${opponentTeam.ties}` : ''}`,
          projectedScore:
            matchupProjection && userTeam
              ? matchupProjection.teamAId === opponentTeam.id
                ? matchupProjection.expectedScoreA
                : matchupProjection.expectedScoreB
              : null,
          roster: compactRecord({
            starters: summarizeRosterNames(opponentRosterSections.starters, opponentNameMap),
            bench: summarizeRosterNames(opponentRosterSections.bench, opponentNameMap),
          }),
          matchupHistory: matchupHistory.map((row) => ({
            weekOrPeriod: row.weekOrPeriod,
            userScore: row.teamA === userTeam?.id ? row.scoreA : row.scoreB,
            opponentScore: row.teamA === opponentTeam.id ? row.scoreA : row.scoreB,
          })),
        })
      : null,
    players,
    specialLeagueNotes: [idpNote, devyNote, c2cNote].filter(Boolean),
  })
}

function buildSpecialistRequestPayload(
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext?: SportsContextResult,
  structuredFantasyContext?: StructuredFantasyContext
): string {
  return JSON.stringify(
    {
      groundedFantasyContext: structuredFantasyContext ?? null,
      ...payload,
      userMessage: payload.userMessage ?? payload.message ?? '',
      deterministicSportsContext: sportsContext
        ? {
            summary: sportsContext.summary,
            sources: sportsContext.sources,
            sport: sportsContext.sport ?? getSportLabel(ctx.sport),
          }
        : null,
      userContext: {
        userId: ctx.userId,
        tier: ctx.tier,
        sport: getSportLabel(sportsContext?.sport ?? ctx.sport),
        leagueFormat: ctx.leagueFormat ?? 'redraft',
        scoring: ctx.scoring ?? 'PPR',
        record: ctx.record ?? null,
        leagueId: ctx.leagueId ?? null,
        teamId: ctx.teamId ?? null,
        insightType: ctx.insightType ?? null,
        season: ctx.season ?? null,
        week: ctx.week ?? null,
        source: ctx.source ?? null,
        recentConversation: ctx.conversation ?? [],
        userPreferences: {
          tone: ctx.memory?.tone ?? 'strategic',
          detailLevel: ctx.memory?.detailLevel ?? 'concise',
          riskMode: ctx.memory?.riskMode ?? 'balanced',
        },
      },
      uploadedImage: ctx.image
        ? {
            attached: true,
            mediaType: ctx.image.mediaType,
            fileName: ctx.image.name ?? null,
          }
        : null,
    },
    null,
    2
  )
}

async function runSpecialist(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext?: SportsContextResult,
  structuredFantasyContext?: StructuredFantasyContext
): Promise<ClaudeCallResult> {
  const specialistPromptKey = intent as PromptKey
  const specialistPrompt =
    intent === 'quick_ask' || intent === 'general'
      ? await PROMPTS.chimmy()
      : await PROMPTS[specialistPromptKey]()
  const systemPrompt = buildRuntimeSystemPrompt(specialistPrompt, ctx, structuredFantasyContext)
  const model = selectModel(
    intent,
    payload,
    ctx,
    String(payload.userMessage ?? payload.message ?? ''),
    structuredFantasyContext ?? null
  )

  return callClaude({
    system: systemPrompt,
    userMessage: buildSpecialistRequestPayload(
      payload,
      ctx,
      sportsContext,
      structuredFantasyContext
    ),
    model,
    maxTokens: TOKEN_LIMITS[intent] ?? TOKEN_LIMITS.general,
    image: ctx.image,
  })
}

export async function runDraftLookaheadAgent(
  payload: Record<string, unknown>,
  ctx: UserContext
): Promise<ClaudeCallResult> {
  const rawPrompt = await PROMPTS.draft_lookahead()
  return callClaude({
    system: buildRuntimeSystemPrompt(rawPrompt, ctx, null),
    userMessage: buildSpecialistRequestPayload(payload, ctx),
    model: MODELS.specialist,
    maxTokens: 900,
    image: ctx.image,
  })
}

async function streamSpecialist(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext: SportsContextResult | undefined,
  structuredFantasyContext: StructuredFantasyContext,
  onText: (delta: string, snapshot: string) => void
): Promise<ClaudeCallResult> {
  const specialistPromptKey = intent as PromptKey
  const specialistPrompt =
    intent === 'quick_ask' || intent === 'general'
      ? await PROMPTS.chimmy()
      : await PROMPTS[specialistPromptKey]()
  const systemPrompt = buildRuntimeSystemPrompt(specialistPrompt, ctx, structuredFantasyContext)
  const model = selectModel(
    intent,
    payload,
    ctx,
    String(payload.userMessage ?? payload.message ?? ''),
    structuredFantasyContext
  )

  return callClaudeStream({
    system: systemPrompt,
    userMessage: buildSpecialistRequestPayload(
      payload,
      ctx,
      sportsContext,
      structuredFantasyContext
    ),
    model,
    maxTokens: TOKEN_LIMITS[intent] ?? TOKEN_LIMITS.general,
    onText,
    image: ctx.image,
  })
}

async function resolvePipelinePlan(userMessage: string, ctx: UserContext): Promise<{
  classification: { result: ClassifyIntentResult; tokensUsed: number }
  sportsContext: SportsContextResult
}> {
  const [classification, sportsContext] = await Promise.all([
    classifyIntent(userMessage, ctx),
    fetchSportsContext(userMessage, ctx),
  ])

  return {
    classification,
    sportsContext,
  }
}

export async function runAgentPipeline(
  userMessage: string,
  ctx: UserContext
): Promise<AgentResponse> {
  try {
    const trimmedMessage =
      userMessage.trim() ||
      (ctx.image ? 'Analyze the uploaded fantasy sports image and explain the key takeaways.' : '')
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length

    if (wordCount <= 8 && !ctx.image) {
      const quickPayload = { userMessage: trimmedMessage }
      const cacheAddress = buildResponseCacheAddress({
        intent: 'quick_ask',
        payload: quickPayload,
        ctx,
        userMessage: trimmedMessage,
      })
      const cached = await readCachedResponse(cacheAddress)
      if (cached) return cached

      const structuredFantasyContext = isPlayerMovementIntent('quick_ask', trimmedMessage)
        ? await buildStructuredFantasyContext('quick_ask', quickPayload, ctx).catch(() => null)
        : null
      const quickResult = await withTimeout(
        runSpecialist('quick_ask', quickPayload, ctx, undefined, structuredFantasyContext),
        AGENT_TIMEOUT_MS,
        'Quick ask timed out.'
      )
      const response: AgentResponse = {
        result: await applySportsDataDisclaimer(quickResult.text),
        intent: 'quick_ask',
        model: quickResult.model,
        tokensUsed: quickResult.tokensUsed,
      }
      await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
      return response
    }

    const { classification, sportsContext } = await withTimeout(
      resolvePipelinePlan(trimmedMessage, ctx),
      AGENT_TIMEOUT_MS,
      'Pipeline planning timed out.'
    )
    const specialistPayload = {
      ...classification.result.payload,
      userMessage: trimmedMessage,
    }
    const cacheAddress = buildResponseCacheAddress({
      intent: classification.result.intent,
      payload: specialistPayload,
      ctx,
      userMessage: trimmedMessage,
    })
    const cached = await readCachedResponse(cacheAddress)
    if (cached) return cached
    const structuredFantasyContext = isPlayerMovementIntent(classification.result.intent, trimmedMessage)
      ? await buildStructuredFantasyContext(classification.result.intent, specialistPayload, ctx).catch(
          () => null
        )
      : null

    if (classification.result.isQuickAsk) {
      const quickResult = await withTimeout(
        runSpecialist(
          classification.result.intent,
          specialistPayload,
          ctx,
          sportsContext ?? undefined,
          structuredFantasyContext
        ),
        AGENT_TIMEOUT_MS,
        'Quick ask specialist timed out.'
      )
      const response: AgentResponse = {
        result: await applySportsDataDisclaimer(quickResult.text),
        intent: classification.result.intent,
        model: quickResult.model,
        tokensUsed: classification.tokensUsed + quickResult.tokensUsed,
      }
      await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
      return response
    }

    if (isProOnlyIntent(classification.result.intent) && ctx.tier !== 'pro') {
      return {
        result: CHIMMY_PREMIUM_FEATURE_MESSAGE,
        intent: classification.result.intent,
        model: MODELS.orchestrator,
        tokensUsed: 0,
        upgradeRequired: true,
        upgradePath: CHIMMY_DEFAULT_UPGRADE_PATH,
      }
    }

    const specialistResult = await withTimeout(
      runSpecialist(
        classification.result.intent,
        specialistPayload,
        ctx,
        sportsContext ?? undefined,
        structuredFantasyContext
      ),
      AGENT_TIMEOUT_MS,
      'Specialist timed out.'
    )

    const response: AgentResponse = {
      result: await applySportsDataDisclaimer(specialistResult.text),
      intent: classification.result.intent,
      model: specialistResult.model,
      tokensUsed: classification.tokensUsed + specialistResult.tokensUsed,
    }
    await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
    return response
  } catch (error) {
    if (
      error instanceof Error &&
      /timed out|longer than expected/i.test(error.message)
    ) {
      return buildTimeoutResponse('general', MODELS.specialist)
    }
    console.error('[anthropic-pipeline] runAgentPipeline failed:', {
      userId: ctx.userId,
      tier: ctx.tier,
      sport: ctx.sport ?? null,
      leagueFormat: ctx.leagueFormat ?? null,
      promptDirCandidates: PROMPT_DIR_CANDIDATES,
      error: error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : error,
    })
    throw error
  }
}

export async function streamAgentPipeline(
  userMessage: string,
  ctx: UserContext,
  onText: (delta: string, snapshot: string) => void
): Promise<AgentResponse> {
  try {
    const trimmedMessage =
      userMessage.trim() ||
      (ctx.image ? 'Analyze the uploaded fantasy sports image and explain the key takeaways.' : '')
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length

    if (wordCount <= 8 && !ctx.image) {
      const quickPayload = { userMessage: trimmedMessage }
      const cacheAddress = buildResponseCacheAddress({
        intent: 'quick_ask',
        payload: quickPayload,
        ctx,
        userMessage: trimmedMessage,
      })
      const cached = await readCachedResponse(cacheAddress)
      if (cached) {
        onText(cached.result, cached.result)
        return cached
      }

      const structuredFantasyContext = isPlayerMovementIntent('quick_ask', trimmedMessage)
        ? await buildStructuredFantasyContext('quick_ask', quickPayload, ctx).catch(() => null)
        : null
      const quickResult = await withTimeout(
        streamSpecialist(
          'quick_ask',
          quickPayload,
          ctx,
          undefined,
          structuredFantasyContext,
          onText
        ),
        AGENT_TIMEOUT_MS,
        'Quick ask stream timed out.'
      )
      const response: AgentResponse = {
        result: await applySportsDataDisclaimer(quickResult.text),
        intent: 'quick_ask',
        model: quickResult.model,
        tokensUsed: quickResult.tokensUsed,
      }
      await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
      return response
    }

    const { classification, sportsContext } = await withTimeout(
      resolvePipelinePlan(trimmedMessage, ctx),
      AGENT_TIMEOUT_MS,
      'Pipeline planning timed out.'
    )
    const specialistPayload = {
      ...classification.result.payload,
      userMessage: trimmedMessage,
    }
    const cacheAddress = buildResponseCacheAddress({
      intent: classification.result.intent,
      payload: specialistPayload,
      ctx,
      userMessage: trimmedMessage,
    })
    const cached = await readCachedResponse(cacheAddress)
    if (cached) {
      onText(cached.result, cached.result)
      return cached
    }
    const structuredFantasyContext = isPlayerMovementIntent(classification.result.intent, trimmedMessage)
      ? await buildStructuredFantasyContext(classification.result.intent, specialistPayload, ctx).catch(
          () => null
        )
      : null

    if (classification.result.isQuickAsk) {
      const quickResult = await withTimeout(
        streamSpecialist(
          classification.result.intent,
          specialistPayload,
          ctx,
          sportsContext ?? undefined,
          structuredFantasyContext,
          onText
        ),
        AGENT_TIMEOUT_MS,
        'Quick ask specialist timed out.'
      )
      const response: AgentResponse = {
        result: await applySportsDataDisclaimer(quickResult.text),
        intent: classification.result.intent,
        model: quickResult.model,
        tokensUsed: classification.tokensUsed + quickResult.tokensUsed,
      }
      await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
      return response
    }

    if (isProOnlyIntent(classification.result.intent) && ctx.tier !== 'pro') {
      return {
        result: CHIMMY_PREMIUM_FEATURE_MESSAGE,
        intent: classification.result.intent,
        model: MODELS.orchestrator,
        tokensUsed: 0,
        upgradeRequired: true,
        upgradePath: CHIMMY_DEFAULT_UPGRADE_PATH,
      }
    }

    const specialistResult = await withTimeout(
      streamSpecialist(
        classification.result.intent,
        specialistPayload,
        ctx,
        sportsContext ?? undefined,
        structuredFantasyContext,
        onText
      ),
      AGENT_TIMEOUT_MS,
      'Specialist stream timed out.'
    )

    const response: AgentResponse = {
      result: await applySportsDataDisclaimer(specialistResult.text),
      intent: classification.result.intent,
      model: specialistResult.model,
      tokensUsed: classification.tokensUsed + specialistResult.tokensUsed,
    }
    await writeCachedResponse(cacheAddress, response, getCacheTtlMs(trimmedMessage))
    return response
  } catch (error) {
    if (
      error instanceof Error &&
      /timed out|longer than expected/i.test(error.message)
    ) {
      const timeoutResponse = buildTimeoutResponse('general', MODELS.specialist)
      onText(timeoutResponse.result, timeoutResponse.result)
      return timeoutResponse
    }
    console.error('[anthropic-pipeline] streamAgentPipeline failed:', {
      userId: ctx.userId,
      tier: ctx.tier,
      sport: ctx.sport ?? null,
      leagueFormat: ctx.leagueFormat ?? null,
      promptDirCandidates: PROMPT_DIR_CANDIDATES,
      error: error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : error,
    })
    throw error
  }
}
