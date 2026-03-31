import Anthropic from '@anthropic-ai/sdk'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { getInsightBundle, type InsightType } from '@/lib/ai-simulation-integration'
import { DEFAULT_SPORT, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? ''

const anthropic = anthropicApiKey
  ? new Anthropic({
      apiKey: anthropicApiKey,
    })
  : null

const MODELS = {
  quickask: process.env.ANTHROPIC_MODEL_QUICKASK?.trim() || 'claude-haiku-4-5-20251001',
  specialist: process.env.ANTHROPIC_MODEL_SPECIALIST?.trim() || 'claude-sonnet-4-6',
  orchestrator: process.env.ANTHROPIC_MODEL_ORCHESTRATOR?.trim() || 'claude-sonnet-4-6',
} as const

const PROMPT_DIR_CANDIDATES = [
  path.resolve(process.cwd(), 'lib', 'agents', 'prompts'),
  path.resolve(process.cwd(), 'src', 'lib', 'agents', 'prompts'),
] as const
const promptCache = new Map<string, string>()

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

type PromptKey =
  | 'chimmy'
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
}

export interface AgentResponse {
  result: string
  intent: IntentType
  model: string
  tokensUsed: number
  upgradeRequired?: boolean
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

const PROMPT_FILES: Record<PromptKey, string> = {
  chimmy: 'chimmy_system_prompt.md',
  trade_evaluation: 'trade_analyzer_agent_prompt.md',
  waiver_wire: 'waiver_wire_agent_prompt.md',
  draft_help: 'draft_assistant_agent_prompt.md',
  matchup_simulator: 'matchup_simulator_agent_prompt.md',
  player_comparison: 'player_comparison_agent_prompt.md',
  power_rankings: 'power_rankings_agent_prompt.md',
  meta_insights: 'meta_insights_agent_prompt.md',
  bracket: 'bracket_agent_prompt.md',
  dynasty_legacy: 'dynasty_legacy_agent_prompt.md',
  storyline: 'storyline_agent_prompt.md',
}

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

async function loadPrompt(promptKey: PromptKey): Promise<string> {
  const fileName = PROMPT_FILES[promptKey]
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
        promptKey,
        fileName,
        filePath,
        cwd: process.cwd(),
        error: details,
      })
    }
  }

  const attemptedPaths = filePaths.join(', ')
  throw new Error(
    `Unable to load prompt "${promptKey}" (${fileName}). Attempted paths: ${attemptedPaths}. ` +
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

export function isAnthropicPipelineAvailable(): boolean {
  return Boolean(anthropic)
}

async function callClaude(args: {
  system: string
  userMessage: string
  model: string
  maxTokens?: number
}): Promise<ClaudeCallResult> {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured.')
  }

  try {
    const response = await anthropic.messages.create({
      model: args.model,
      max_tokens: args.maxTokens ?? 1500,
      system: args.system,
      messages: [{ role: 'user', content: args.userMessage }],
    })

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
}): Promise<ClaudeCallResult> {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured.')
  }

  try {
    const stream = anthropic.messages.stream({
      model: args.model,
      max_tokens: args.maxTokens ?? 1500,
      system: args.system,
      messages: [{ role: 'user', content: args.userMessage }],
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

    return {
      text: finalText?.trim() || latestSnapshot.trim(),
      tokensUsed:
        Math.max(0, finalMessage.usage.input_tokens ?? 0) +
        Math.max(0, finalMessage.usage.output_tokens ?? 0),
      model: finalMessage.model || args.model,
    }
  } catch (error: unknown) {
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
  const systemPrompt = await loadPrompt('chimmy')
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
    '',
    '## RECENT CONVERSATION',
    buildConversationContext(ctx.conversation),
    '',
    '## USER MESSAGE',
    userMessage,
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
    maxTokens: 300,
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

function buildSpecialistRequestPayload(
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext?: SportsContextResult
): string {
  return JSON.stringify(
    {
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
    },
    null,
    2
  )
}

async function runSpecialist(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext?: SportsContextResult
): Promise<ClaudeCallResult> {
  const specialistPromptKey = intent as PromptKey
  const specialistPrompt =
    intent === 'quick_ask' || intent === 'general'
      ? await loadPrompt('chimmy')
      : await loadPrompt(specialistPromptKey)

  return callClaude({
    system: specialistPrompt,
    userMessage: buildSpecialistRequestPayload(payload, ctx, sportsContext),
    model:
      intent === 'quick_ask' || intent === 'general' ? MODELS.quickask : MODELS.specialist,
    maxTokens: intent === 'quick_ask' || intent === 'general' ? 500 : 2000,
  })
}

async function streamSpecialist(
  intent: IntentType,
  payload: Record<string, unknown>,
  ctx: UserContext,
  sportsContext: SportsContextResult | undefined,
  onText: (delta: string, snapshot: string) => void
): Promise<ClaudeCallResult> {
  const specialistPromptKey = intent as PromptKey
  const specialistPrompt =
    intent === 'quick_ask' || intent === 'general'
      ? await loadPrompt('chimmy')
      : await loadPrompt(specialistPromptKey)

  return callClaudeStream({
    system: specialistPrompt,
    userMessage: buildSpecialistRequestPayload(payload, ctx, sportsContext),
    model:
      intent === 'quick_ask' || intent === 'general' ? MODELS.quickask : MODELS.specialist,
    maxTokens: intent === 'quick_ask' || intent === 'general' ? 500 : 2000,
    onText,
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
    const trimmedMessage = userMessage.trim()
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length

    if (wordCount <= 8) {
      const quickResult = await runSpecialist('quick_ask', { userMessage: trimmedMessage }, ctx)
      return {
        result: quickResult.text,
        intent: 'quick_ask',
        model: quickResult.model,
        tokensUsed: quickResult.tokensUsed,
      }
    }

    const { classification, sportsContext } = await resolvePipelinePlan(trimmedMessage, ctx)

    if (classification.result.isQuickAsk) {
      const quickResult = await runSpecialist(
        classification.result.intent,
        {
          ...classification.result.payload,
          userMessage: trimmedMessage,
        },
        ctx,
        sportsContext ?? undefined
      )
      return {
        result: quickResult.text,
        intent: classification.result.intent,
        model: quickResult.model,
        tokensUsed: classification.tokensUsed + quickResult.tokensUsed,
      }
    }

    if (isProOnlyIntent(classification.result.intent) && ctx.tier !== 'pro') {
      return {
        result:
          'This feature requires AF Pro. Upgrade to unlock full trade analysis, waiver recommendations, draft assistance, and dynasty projections.',
        intent: classification.result.intent,
        model: MODELS.orchestrator,
        tokensUsed: 0,
        upgradeRequired: true,
      }
    }

    const specialistResult = await runSpecialist(
      classification.result.intent,
      {
        ...classification.result.payload,
        userMessage: trimmedMessage,
      },
      ctx,
      sportsContext ?? undefined
    )

    return {
      result: specialistResult.text,
      intent: classification.result.intent,
      model: specialistResult.model,
      tokensUsed: classification.tokensUsed + specialistResult.tokensUsed,
    }
  } catch (error) {
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
    const trimmedMessage = userMessage.trim()
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length

    if (wordCount <= 8) {
      const quickResult = await streamSpecialist(
        'quick_ask',
        { userMessage: trimmedMessage },
        ctx,
        undefined,
        onText
      )
      return {
        result: quickResult.text,
        intent: 'quick_ask',
        model: quickResult.model,
        tokensUsed: quickResult.tokensUsed,
      }
    }

    const { classification, sportsContext } = await resolvePipelinePlan(trimmedMessage, ctx)

    if (classification.result.isQuickAsk) {
      const quickResult = await streamSpecialist(
        classification.result.intent,
        {
          ...classification.result.payload,
          userMessage: trimmedMessage,
        },
        ctx,
        sportsContext ?? undefined,
        onText
      )
      return {
        result: quickResult.text,
        intent: classification.result.intent,
        model: quickResult.model,
        tokensUsed: classification.tokensUsed + quickResult.tokensUsed,
      }
    }

    if (isProOnlyIntent(classification.result.intent) && ctx.tier !== 'pro') {
      return {
        result:
          'This feature requires AF Pro. Upgrade to unlock full trade analysis, waiver recommendations, draft assistance, and dynasty projections.',
        intent: classification.result.intent,
        model: MODELS.orchestrator,
        tokensUsed: 0,
        upgradeRequired: true,
      }
    }

    const specialistResult = await streamSpecialist(
      classification.result.intent,
      {
        ...classification.result.payload,
        userMessage: trimmedMessage,
      },
      ctx,
      sportsContext ?? undefined,
      onText
    )

    return {
      result: specialistResult.text,
      intent: classification.result.intent,
      model: specialistResult.model,
      tokensUsed: classification.tokensUsed + specialistResult.tokensUsed,
    }
  } catch (error) {
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
