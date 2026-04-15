import { prisma } from '@/lib/prisma'
import { listAiMemoryByUser, upsertAiMemory, type AiMemoryScope } from './ai-memory-store'

export type UnifiedMemoryScope = 'personal' | 'team' | 'league' | 'platform'

export type UnifiedMemoryCategory =
  | 'strategy_preference'
  | 'interaction_pattern'
  | 'chat_context'
  | 'alert_response'
  | 'action_outcome'
  | 'commissioner_behavior'
  | 'system_adaptation'

export interface UnifiedMemoryFactInput {
  userId: string
  leagueId?: string | null
  teamId?: string | null
  scope: UnifiedMemoryScope
  category: UnifiedMemoryCategory
  content: string
  confidence: number
  source: string
  sport?: string | null
  metadata?: Record<string, unknown>
}

export interface UnifiedMemoryRecord {
  scope: UnifiedMemoryScope
  category: UnifiedMemoryCategory
  content: string
  confidence: number
  source: string
  sport: string | null
  teamId: string | null
  updatedAt: string
  metadata?: Record<string, unknown>
}

export interface UnifiedMemoryContextInput {
  userId: string
  role?: 'member' | 'commissioner' | 'admin'
  leagueId?: string | null
  teamId?: string | null
  includePlatform?: boolean
}

const SENSITIVE_HINTS = [
  /politic/i,
  /religio/i,
  /medical|diagnos|disease|disorder/i,
  /sexual|sex life/i,
  /race|ethnic/i,
]

function mapUnifiedScopeToStoreScope(scope: UnifiedMemoryScope): AiMemoryScope {
  if (scope === 'personal') return 'user_preferences'
  if (scope === 'league') return 'league_history'
  return 'coaching_notes'
}

function buildUnifiedMemoryKey(input: {
  scope: UnifiedMemoryScope
  category: UnifiedMemoryCategory
  source: string
  teamId?: string | null
}): string {
  const sourceSlug = input.source.toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').slice(0, 64)
  const teamSegment = input.scope === 'team' ? (input.teamId ?? 'global') : 'global'
  return `um:${input.scope}:${teamSegment}:${input.category}:${sourceSlug}`
}

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 0
  return Math.max(0, Math.min(1, confidence))
}

function ttlFromCategory(category: UnifiedMemoryCategory, confidence: number): Date | null {
  if (confidence < 0.5) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
  if (category === 'interaction_pattern' || category === 'chat_context' || category === 'alert_response') {
    return new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  }
  return null
}

function isAllowedContent(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length < 3) return false
  return !SENSITIVE_HINTS.some((pattern) => pattern.test(trimmed))
}

function parseUnifiedMemoryRecord(value: unknown): UnifiedMemoryRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.content !== 'string') return null
  if (typeof row.scope !== 'string') return null
  if (typeof row.category !== 'string') return null
  return {
    scope: row.scope as UnifiedMemoryScope,
    category: row.category as UnifiedMemoryCategory,
    content: row.content,
    confidence: typeof row.confidence === 'number' ? row.confidence : 0.6,
    source: typeof row.source === 'string' ? row.source : 'unknown',
    sport: typeof row.sport === 'string' ? row.sport : null,
    teamId: typeof row.teamId === 'string' ? row.teamId : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString(),
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : undefined,
  }
}

function formatContextLine(record: UnifiedMemoryRecord): string {
  const confidencePct = Math.round(clampConfidence(record.confidence) * 100)
  return `- [${record.scope}/${record.category}] ${record.content} (confidence ${confidencePct}%)`
}

export async function getUnifiedMemoryRecords(input: UnifiedMemoryContextInput): Promise<UnifiedMemoryRecord[]> {
  const rows = await listAiMemoryByUser(input.userId, {
    leagueId: input.leagueId,
    scopes: ['user_preferences', 'league_history', 'coaching_notes'],
  })

  const includePlatform = input.includePlatform ?? true
  const role = input.role ?? 'member'

  return rows
    .filter((row) => row.key.startsWith('um:'))
    .map((row) => parseUnifiedMemoryRecord(row.value))
    .filter((row): row is UnifiedMemoryRecord => Boolean(row))
    .filter((row) => {
      if (row.scope === 'team') return Boolean(input.teamId) && row.teamId === input.teamId
      if (row.scope === 'league') return Boolean(input.leagueId)
      if (row.scope === 'platform') return includePlatform
      return true
    })
    .filter((row) => role !== 'member' || row.category !== 'commissioner_behavior')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function upsertUnifiedMemoryFact(input: UnifiedMemoryFactInput): Promise<void> {
  const content = input.content.trim().replace(/\s+/g, ' ').slice(0, 500)
  if (!isAllowedContent(content)) return

  const confidence = clampConfidence(input.confidence)
  const nowIso = new Date().toISOString()
  const key = buildUnifiedMemoryKey({
    scope: input.scope,
    category: input.category,
    source: input.source,
    teamId: input.teamId,
  })

  await upsertAiMemory({
    userId: input.userId,
    leagueId: input.scope === 'personal' || input.scope === 'platform' ? null : input.leagueId ?? null,
    scope: mapUnifiedScopeToStoreScope(input.scope),
    key,
    value: {
      scope: input.scope,
      category: input.category,
      content,
      confidence,
      source: input.source,
      sport: input.sport ?? null,
      teamId: input.teamId ?? null,
      updatedAt: nowIso,
      metadata: input.metadata ?? {},
    },
  })

  await prisma.aIMemoryEvent.create({
    data: {
      userId: input.userId,
      leagueId: input.leagueId ?? null,
      teamId: input.teamId ?? null,
      eventType: 'unified_memory_write',
      subject: `${input.scope}:${input.category}`,
      content: {
        source: input.source,
        confidence,
      },
      confidence,
      expiresAt: ttlFromCategory(input.category, confidence),
    },
  }).catch(() => undefined)
}

export async function buildUnifiedMemoryPromptSection(input: UnifiedMemoryContextInput): Promise<string> {
  const scoped = (await getUnifiedMemoryRecords(input)).slice(0, 14)

  if (!scoped.length) return ''

  return [
    '## UNIFIED MEMORY (scope-safe)',
    ...scoped.map(formatContextLine),
    'Use this memory only when it is relevant to the user\'s current question.',
  ].join('\n')
}

export async function recordUnifiedMemoryInteraction(input: {
  userId: string
  leagueId?: string | null
  teamId?: string | null
  source: 'chat' | 'alerts' | 'dashboard' | 'actions' | 'commissioner'
  eventType: string
  content: string
  sport?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const category: UnifiedMemoryCategory =
    input.source === 'alerts'
      ? 'alert_response'
      : input.source === 'actions'
        ? 'action_outcome'
        : input.source === 'commissioner'
          ? 'commissioner_behavior'
          : 'interaction_pattern'

  await upsertUnifiedMemoryFact({
    userId: input.userId,
    leagueId: input.leagueId,
    teamId: input.teamId,
    scope: input.teamId ? 'team' : input.leagueId ? 'league' : 'personal',
    category,
    content: `${input.eventType}: ${input.content}`,
    confidence: 0.72,
    source: input.source,
    sport: input.sport,
    metadata: input.metadata,
  })
}

export async function recordUnifiedMemoryFromChatTurn(input: {
  userId: string
  leagueId?: string | null
  teamId?: string | null
  sport?: string | null
  userMessage: string
  assistantAnswer?: string | null
}): Promise<void> {
  const msg = input.userMessage.trim()
  if (!msg) return

  const lowered = msg.toLowerCase()
  if (/aggressive|conservative|safe|upside|risk/i.test(lowered)) {
    await upsertUnifiedMemoryFact({
      userId: input.userId,
      leagueId: input.leagueId,
      teamId: input.teamId,
      scope: 'personal',
      category: 'strategy_preference',
      content: `User expressed strategy preference: ${msg.slice(0, 200)}`,
      confidence: 0.78,
      source: 'chat',
      sport: input.sport,
    })
  }

  await recordUnifiedMemoryInteraction({
    userId: input.userId,
    leagueId: input.leagueId,
    teamId: input.teamId,
    source: 'chat',
    eventType: 'user_message',
    content: msg.slice(0, 220),
    sport: input.sport,
  })

  if (input.assistantAnswer && input.assistantAnswer.trim().length > 0) {
    await upsertUnifiedMemoryFact({
      userId: input.userId,
      leagueId: input.leagueId,
      teamId: input.teamId,
      scope: input.teamId ? 'team' : input.leagueId ? 'league' : 'personal',
      category: 'chat_context',
      content: `Assistant guidance: ${input.assistantAnswer.trim().slice(0, 220)}`,
      confidence: 0.66,
      source: 'chat',
      sport: input.sport,
    })
  }
}

export async function recordUnifiedMemoryFeedback(input: {
  userId: string
  leagueId?: string | null
  teamId?: string | null
  category: UnifiedMemoryCategory
  wasUseful: boolean
  source: string
}): Promise<void> {
  await prisma.aIMemoryEvent.create({
    data: {
      userId: input.userId,
      leagueId: input.leagueId ?? null,
      teamId: input.teamId ?? null,
      eventType: 'memory_feedback',
      subject: input.category,
      content: {
        source: input.source,
        wasUseful: input.wasUseful,
      },
      confidence: input.wasUseful ? 0.85 : 0.35,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
  }).catch(() => undefined)
}
