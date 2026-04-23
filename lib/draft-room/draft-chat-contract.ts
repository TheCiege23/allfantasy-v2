/**
 * Wire contract for `/api/leagues/[leagueId]/draft/chat` — backward compatible with
 * plain text rows; optional structured fields come from LeagueChatMessage.type + metadata.
 */

import type { PlatformChatMessage } from '@/types/platform-shared'
import type { LeaguePollPayload } from '@/lib/league-chat/LeaguePollService'
import type { DraftChatPlayerContext } from '@/lib/draft-room/draft-chat-player-context'

export type DraftChatMessageCategory =
  | 'USER_MESSAGE'
  | 'SYSTEM_PICK_NOTIFICATION'
  | 'COMMISSIONER_SYSTEM_MESSAGE'
  | 'AI_MESSAGE'
  | 'MEDIA_MESSAGE'
  | 'POLL_MESSAGE'

/** Semantic origin for UI / analytics (not necessarily DB `source`). */
export type DraftChatSourceContext = 'draft_room' | 'league_chat' | 'chimmy' | 'system' | 'unknown'

export type DraftChatReactionWire = {
  emoji: string
  count: number
  userIds: string[]
}

export type DraftPickMetaWire = {
  playerName: string | null
  position: string | null
  rosterDisplayName: string | null
  pickedAt: string | null
  overall: number | null
  pickLabel: string | null
  /** Present for new pick rows; older history may omit. */
  round: number | null
  roundSlot: number | null
  playerId: string | null
  nflTeam: string | null
  headshotUrl: string | null
  teamLogoUrl: string | null
}

export type DraftChatAiMetadataWire = {
  aiRecommendationType?: string | null
  confidence?: number | null
  rationale?: string | null
  actions?: Array<{ label: string; action?: string }>
}

export type DraftChatWireMessage = {
  id: string
  /** Display label (sender or system label like "Draft room"). */
  from: string
  text: string
  at: string
  messageType?: string
  /** High-level category for rendering and sync policy hints. */
  messageCategory: DraftChatMessageCategory
  sourceContext: DraftChatSourceContext
  /**
   * When live draft league sync is ON, whether this row is also visible in the standalone
   * league chat stream for all members (draft-only / pick / excluded rows → false).
   */
  syncToLeagueChat: boolean
  mediaUrl?: string | null
  /** Normalized media kind from message type + metadata (gif, image, …). */
  mediaKind?: string | null
  gifProvider?: string | null
  thumbnailUrl?: string | null
  lastActiveAt?: string | null
  isBroadcast?: boolean
  isAiSuggestion?: boolean
  playerContext?: DraftChatPlayerContext | null
  mentions?: string[]
  reactions?: DraftChatReactionWire[]
  isDraftPickEvent?: boolean
  draftPickMeta?: DraftPickMetaWire | null
  pollPayload?: LeaguePollPayload | null
  /** Same as message id — explicit for poll clients. */
  pollId?: string | null
  pollExpiresAt?: string | null
  /** Viewer-facing identity (from PlatformChatMessage). */
  senderUserId?: string | null
  senderDisplayName?: string | null
  senderAvatarUrl?: string | null
  leagueId?: string | null
  aiMetadata?: DraftChatAiMetadataWire | null
  /**
   * Client-only overlay (optional): row counts as unread for collapsed-chat badge when draft chat
   * merges local read state — not persisted on the wire/API contract.
   */
  unread?: boolean
}

const COPILOT_TYPES = new Set(['copilot_on_clock', 'copilot_prepare', 'queue_conflict'])

export function sanitizeDraftChatStructuredSendMeta(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}
  if (typeof o.gifProvider === 'string') {
    const g = o.gifProvider.trim().slice(0, 48)
    if (g) out.gifProvider = g
  }
  if (typeof o.thumbnailUrl === 'string') {
    const t = o.thumbnailUrl.trim()
    if (t.startsWith('http') && t.length <= 2048) out.thumbnailUrl = t
  }
  return out
}

function normalizeReactionEntries(metadata: unknown): DraftChatReactionWire[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const raw = (metadata as Record<string, unknown>).reactions
  if (!Array.isArray(raw)) return []
  const out: DraftChatReactionWire[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const e = entry as { emoji?: unknown; count?: unknown; userIds?: unknown }
    const emoji = typeof e.emoji === 'string' ? e.emoji.trim() : ''
    if (!emoji) continue
    const userIds = Array.isArray(e.userIds)
      ? e.userIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
    const countRaw = e.count
    const count =
      typeof countRaw === 'number' && Number.isFinite(countRaw)
        ? Math.max(0, Math.floor(countRaw))
        : userIds.length
    out.push({ emoji, count, userIds })
  }
  return out
}

function inferCategory(
  normalizedType: string,
  isDraftPickEvent: boolean,
  isAiSuggestion: boolean,
): DraftChatMessageCategory {
  if (isDraftPickEvent) return 'SYSTEM_PICK_NOTIFICATION'
  if (normalizedType === 'poll') return 'POLL_MESSAGE'
  if (normalizedType === 'broadcast' || normalizedType === 'system') return 'COMMISSIONER_SYSTEM_MESSAGE'
  if (isAiSuggestion) return 'AI_MESSAGE'
  if (['gif', 'image', 'video', 'meme', 'link'].includes(normalizedType)) return 'MEDIA_MESSAGE'
  return 'USER_MESSAGE'
}

function inferSourceContext(
  normalizedType: string,
  meta: Record<string, unknown> | null,
  channelSource: string | null | undefined,
  isDraftPickEvent: boolean,
  isAiSuggestion: boolean,
): DraftChatSourceContext {
  if (
    typeof meta?.messageSubtype === 'string' &&
    meta.messageSubtype.toLowerCase().includes('chimmy')
  ) {
    return 'chimmy'
  }
  if (
    typeof meta?.sourceContext === 'string' &&
    ['draft_room', 'league_chat', 'chimmy', 'system'].includes(String(meta.sourceContext))
  ) {
    return meta.sourceContext as DraftChatSourceContext
  }
  if (isDraftPickEvent || channelSource === 'draft') return 'draft_room'
  if (normalizedType === 'system' || normalizedType === 'broadcast') return 'system'
  if (isAiSuggestion) return 'chimmy'
  if (channelSource == null) return 'league_chat'
  return 'unknown'
}

function extractAiMetadata(meta: Record<string, unknown> | null): DraftChatAiMetadataWire | null {
  if (!meta) return null
  const aiRecommendationType =
    typeof meta.aiRecommendationType === 'string' ? meta.aiRecommendationType : undefined
  const rationale = typeof meta.rationale === 'string' ? meta.rationale : undefined
  let confidence: number | undefined
  if (typeof meta.confidence === 'number' && Number.isFinite(meta.confidence)) {
    confidence = meta.confidence
  } else if (typeof meta.confidence === 'string') {
    const n = Number(meta.confidence)
    if (Number.isFinite(n)) confidence = n
  }
  let actions: DraftChatAiMetadataWire['actions']
  if (Array.isArray(meta.actions)) {
    actions = meta.actions
      .map((a) => {
        if (!a || typeof a !== 'object') return null
        const r = a as Record<string, unknown>
        const label = typeof r.label === 'string' ? r.label.trim() : ''
        if (!label) return null
        const action = typeof r.action === 'string' ? r.action : undefined
        return { label, action }
      })
      .filter(Boolean) as DraftChatAiMetadataWire['actions']
  }
  if (!aiRecommendationType && !rationale && confidence == null && !actions?.length) return null
  return {
    aiRecommendationType: aiRecommendationType ?? null,
    rationale: rationale ?? null,
    confidence: confidence ?? null,
    actions,
  }
}

export function buildDraftChatWireMessage(
  m: PlatformChatMessage,
  opts: {
    syncActive: boolean
    leagueId?: string | null
    sanitizePlayerContext: (raw: unknown) => DraftChatPlayerContext | null
    parsePollPayload: (input: { body?: string | null; metadata?: Record<string, unknown> | null }) => LeaguePollPayload | null
  },
): DraftChatWireMessage {
  const metadata = m.metadata ?? null
  const metaRecord = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null
  const normalizedType = String(m.messageType ?? 'text').toLowerCase()

  const fromMetaAi =
    typeof metaRecord?.isAiSuggestion === 'boolean'
      ? metaRecord.isAiSuggestion
      : COPILOT_TYPES.has(normalizedType)
  const isAiSuggestion = Boolean(fromMetaAi)

  const isDraftPickEvent =
    normalizedType === 'draft_pick' ||
    Boolean(metaRecord && metaRecord.draftPickEvent === true)

  const playerContext = opts.sanitizePlayerContext(metaRecord?.playerContext)

  const draftPickMeta: DraftPickMetaWire | null =
    isDraftPickEvent && metaRecord
      ? {
          playerName: typeof metaRecord.playerName === 'string' ? metaRecord.playerName : null,
          position: typeof metaRecord.position === 'string' ? metaRecord.position : null,
          rosterDisplayName:
            typeof metaRecord.rosterDisplayName === 'string' ? metaRecord.rosterDisplayName : null,
          pickedAt: typeof metaRecord.pickedAt === 'string' ? metaRecord.pickedAt : null,
          overall: typeof metaRecord.overall === 'number' ? metaRecord.overall : null,
          pickLabel: typeof metaRecord.pickLabel === 'string' ? metaRecord.pickLabel : null,
          round: typeof metaRecord.round === 'number' ? metaRecord.round : null,
          roundSlot:
            typeof metaRecord.roundSlot === 'number'
              ? metaRecord.roundSlot
              : typeof metaRecord.slot === 'number'
                ? metaRecord.slot
                : null,
          playerId: typeof metaRecord.playerId === 'string' ? metaRecord.playerId : null,
          nflTeam: typeof metaRecord.nflTeam === 'string' ? metaRecord.nflTeam : null,
          headshotUrl: typeof metaRecord.headshotUrl === 'string' ? metaRecord.headshotUrl : null,
          teamLogoUrl: typeof metaRecord.teamLogoUrl === 'string' ? metaRecord.teamLogoUrl : null,
        }
      : null

  let pollPayload: LeaguePollPayload | null = null
  if (normalizedType === 'poll') {
    pollPayload = opts.parsePollPayload({
      body: m.body,
      metadata: metaRecord,
    })
  }

  const displayFrom = isDraftPickEvent
    ? 'Draft room'
    : normalizedType === 'system'
      ? (m.senderName ?? 'League')
      : (m.senderName ?? 'User')

  const messageCategory = inferCategory(normalizedType, isDraftPickEvent, isAiSuggestion)

  const channelSource = m.channelSource ?? null
  const sourceContext = inferSourceContext(normalizedType, metaRecord, channelSource, isDraftPickEvent, isAiSuggestion)

  const isPrivateRow = Boolean(metaRecord?.isPrivate)
  const leagueExcluded = Boolean(metaRecord?.leagueChatSyncExcluded)
  const syncToLeagueChat = Boolean(
    opts.syncActive &&
      !isPrivateRow &&
      !leagueExcluded &&
      channelSource !== 'draft' &&
      messageCategory !== 'SYSTEM_PICK_NOTIFICATION',
  )

  const gifProvider =
    typeof metaRecord?.gifProvider === 'string' ? metaRecord.gifProvider : null
  const thumbnailUrl =
    typeof metaRecord?.thumbnailUrl === 'string' ? metaRecord.thumbnailUrl : null
  const mediaKind = ['gif', 'image', 'video', 'meme', 'link'].includes(normalizedType)
    ? normalizedType
    : null

  const aiMetadata = extractAiMetadata(metaRecord)

  return {
    id: m.id,
    from: displayFrom,
    text: m.body,
    at: m.createdAt,
    messageCategory,
    sourceContext,
    syncToLeagueChat,
    messageType: normalizedType,
    mediaUrl:
      (metadata as { mediaUrl?: string } | null)?.mediaUrl ??
      (metadata as { imageUrl?: string } | null)?.imageUrl ??
      null,
    mediaKind,
    gifProvider,
    thumbnailUrl,
    mentions: Array.isArray(metaRecord?.mentions) ? (metaRecord.mentions as string[]) : [],
    lastActiveAt: typeof metaRecord?.lastActiveAt === 'string' ? metaRecord.lastActiveAt : null,
    reactions: normalizeReactionEntries(metadata),
    isBroadcast: normalizedType === 'broadcast',
    ...(playerContext ? { playerContext } : {}),
    ...(isAiSuggestion ? { isAiSuggestion: true as const } : {}),
    ...(isDraftPickEvent ? { isDraftPickEvent: true as const, draftPickMeta } : {}),
    ...(pollPayload
      ? {
          pollPayload,
          pollId: m.id,
          ...(typeof metaRecord?.pollExpiresAt === 'string'
            ? { pollExpiresAt: metaRecord.pollExpiresAt }
            : {}),
        }
      : {}),
    senderUserId: m.senderUserId ?? null,
    senderDisplayName: m.senderName ?? null,
    senderAvatarUrl: m.senderAvatarUrl ?? null,
    leagueId: opts.leagueId ?? null,
    ...(aiMetadata ? { aiMetadata } : {}),
  }
}
