'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { UserLeague } from '../types'
import { ChatComposer, type LeagueComposerPayload } from './chat/ChatComposer'
import { ChatSenderAvatar } from './chat/ChatSenderAvatar'
import { isLeagueMessageThreaded } from './chat/chat-timestamps'

export type LeagueChatMessage = {
  id: string
  authorId: string
  author_display_name: string
  author_avatar: string | null
  messageType?: string
  /** Unix ms (Sleeper-style); preferred for display */
  created: number
  text: string
  isActivity: boolean
  activityText?: string
  playerName?: string
  createdAt: string
  metadata?: Record<string, unknown> | null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function formatChatTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  const yday = new Date()
  yday.setDate(yday.getDate() - 1)
  if (date.toDateString() === yday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  return (
    date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  )
}

function getGifDisplay(meta: Record<string, unknown> | null | undefined): {
  previewUrl: string
  url: string
  title: string
} | null {
  if (!meta) return null
  const nested = meta.gif
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const g = nested as Record<string, unknown>
    const previewUrl =
      (typeof g.previewUrl === 'string' ? g.previewUrl : null) ??
      (typeof g.url === 'string' ? g.url : null)
    const url = (typeof g.url === 'string' ? g.url : null) ?? previewUrl
    if (previewUrl || url) {
      return {
        previewUrl: previewUrl ?? url ?? '',
        url: url ?? previewUrl ?? '',
        title: typeof g.title === 'string' ? g.title : 'GIF',
      }
    }
  }
  const previewUrl =
    (typeof meta.previewUrl === 'string' ? meta.previewUrl : null) ??
    (typeof meta.gifUrl === 'string' ? meta.gifUrl : null)
  const url = (typeof meta.gifUrl === 'string' ? meta.gifUrl : null) ?? previewUrl
  if (!previewUrl && !url) return null
  return {
    previewUrl: previewUrl ?? url ?? '',
    url: url ?? previewUrl ?? '',
    title: typeof meta.gifTitle === 'string' ? meta.gifTitle : 'GIF',
  }
}

function GifWithAttribution({
  gif,
}: {
  gif: { previewUrl: string; url: string; title: string }
}) {
  return (
    <div className="mt-1.5">
      <img
        src={gif.previewUrl || gif.url}
        alt={gif.title || 'GIF'}
        className="max-h-[160px] max-w-full rounded-xl object-cover"
      />
      <a
        href="https://giphy.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 block text-right text-[8px] text-white/25 transition-colors hover:text-white/50"
      >
        GIPHY
      </a>
    </div>
  )
}

function parseCreatedUnixMs(o: Record<string, unknown>): number {
  const c = o.created
  if (typeof c === 'number' && Number.isFinite(c)) return c
  const ca = o.createdAt
  if (typeof ca === 'string' && ca) {
    const t = new Date(ca).getTime()
    if (Number.isFinite(t)) return t
  }
  return Date.now()
}

function mapLeagueApiMessage(raw: unknown): LeagueChatMessage | null {
  const o = toRecord(raw)
  if (!o) return null
  const id = toStringValue(o.id)
  if (!id) return null
  const meta = toRecord(o.metadata)
  const nameRaw = o.authorName ?? o.author_display_name
  const avatarRaw = o.authorAvatarUrl ?? o.author_avatar
  const createdMs = parseCreatedUnixMs(o)
  const messageType = toStringValue(o.messageType, '')
  return {
    id,
    authorId: toStringValue(o.authorId, ''),
    author_display_name: toStringValue(nameRaw, 'Manager'),
    author_avatar: typeof avatarRaw === 'string' || avatarRaw === null ? (avatarRaw as string | null) : null,
    messageType: messageType || undefined,
    created: createdMs,
    text: toStringValue(o.text),
    isActivity: false,
    createdAt: new Date(createdMs).toISOString(),
    metadata: meta,
  }
}

type LeagueChatInPanelProps = {
  selectedLeague: UserLeague
  userId: string
  /** Shown on outgoing bubbles + optimistic send */
  userDisplayName?: string
  userImage?: string | null
  onAskChimmy: () => void
  /** Server-passed prefill when URL cannot be read client-side */
  zombieChimmyPrefill?: string | null
}

/**
 * League chat thread (left panel / AF Chat league tab).
 * Uses `/api/league/chat` (main app League + LeagueChatMessage).
 */
export function LeagueChatInPanel({
  selectedLeague,
  userId,
  userDisplayName = 'You',
  userImage = null,
  onAskChimmy,
  zombieChimmyPrefill = null,
}: LeagueChatInPanelProps) {
  const [messages, setMessages] = useState<LeagueChatMessage[]>([])
  const [queryPrefill, setQueryPrefill] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const errorTimeoutRef = useRef<number | null>(null)

  const clearError = useCallback(() => {
    setError(null)
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }
  }, [])

  const showTimedError = useCallback(
    (message: string) => {
      clearError()
      setError(message)
      errorTimeoutRef.current = window.setTimeout(() => {
        setError(null)
        errorTimeoutRef.current = null
      }, 3000)
    },
    [clearError]
  )

  const loadMessages = useCallback(async () => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch(
        `/api/league/chat?leagueId=${encodeURIComponent(selectedLeague.id)}&limit=50`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        throw new Error('League chat unavailable')
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const rawMessages = Array.isArray(payload.messages) ? payload.messages : []
      const nextMessages = rawMessages
        .map((message) => mapLeagueApiMessage(message))
        .filter((message): message is LeagueChatMessage => Boolean(message))

      setMessages(nextMessages)
    } catch {
      setMessages([])
      showTimedError('Could not load league chat')
    } finally {
      setLoading(false)
    }
  }, [clearError, selectedLeague.id, showTimedError])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (selectedLeague.leagueVariant !== 'big_brother') return
    const url = `/api/leagues/${encodeURIComponent(selectedLeague.id)}/big-brother/vote-progress-stream`
    const es = new EventSource(url)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          type?: string
          message?: { id: string; text: string; metadata?: Record<string, unknown> | null }
        }
        if (data.type !== 'vote_progress' || !data.message) return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message!.id
              ? {
                  ...m,
                  text: data.message!.text,
                  metadata: { ...m.metadata, ...data.message!.metadata },
                }
              : m
          )
        )
      } catch {
        /* ignore */
      }
    }
    return () => es.close()
  }, [selectedLeague.id, selectedLeague.leagueVariant])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('zombieChimmy')
    if (!q) return
    setQueryPrefill(q)
    params.delete('zombieChimmy')
    const next = params.toString()
    const path = window.location.pathname
    window.history.replaceState(null, '', next ? `${path}?${next}` : path)
  }, [selectedLeague.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  const handleComposerSend = useCallback(
    async (payload: LeagueComposerPayload) => {
      // eslint-disable-next-line no-console -- intentional for rich-payload debugging until UI renders all types
      console.log('[league-chat] composer payload', payload)

      const text = payload.text.trim()
      const metadata: Record<string, unknown> = {}

      if (payload.gifUrl || payload.giphyId) {
        if (payload.gifId) metadata.gifId = payload.gifId
        if (payload.giphyId) metadata.giphyId = payload.giphyId
        if (payload.gifUrl) metadata.gifUrl = payload.gifUrl
        if (payload.previewUrl) metadata.previewUrl = payload.previewUrl
        if (payload.gifTitle) metadata.gifTitle = payload.gifTitle
        metadata.gif = {
          previewUrl: payload.previewUrl ?? payload.gifUrl ?? '',
          url: payload.gifUrl ?? '',
          title: payload.gifTitle ?? 'GIF',
        }
      }

      if (payload.attachments?.length) {
        metadata.attachments = payload.attachments.map((a) => ({
          type: a.type,
          url: a.url,
          duration: a.duration,
          mimeType: a.mimeType,
        }))
      }

      if (payload.poll) {
        metadata.poll = {
          question: payload.poll.question,
          options: payload.poll.options.map((t, i) => ({
            id: `opt-${i}-${Date.now()}`,
            text: t,
            votes: [] as string[],
          })),
          closeAt: payload.poll.closeAt.toISOString(),
          allowMultiple: payload.poll.allowMultiple,
        }
      }

      const displayText =
        text ||
        (payload.gifUrl || payload.giphyId ? '🎬 GIF' : '') ||
        (payload.poll ? `📊 ${payload.poll.question}` : '') ||
        (payload.attachments?.length ? '📎 Media' : '')

      if (!displayText && !Object.keys(metadata).length) return

      setSending(true)
      clearError()

      const nowMs = Date.now()
      const optimisticMessage: LeagueChatMessage = {
        id: `temp-${nowMs}`,
        authorId: userId,
        author_display_name: userDisplayName,
        author_avatar: userImage ?? null,
        created: nowMs,
        text: displayText,
        isActivity: false,
        createdAt: new Date(nowMs).toISOString(),
        metadata: Object.keys(metadata).length ? metadata : null,
      }

      setMessages((current) => [...current, optimisticMessage])

      try {
        const response = await fetch('/api/league/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leagueId: selectedLeague.id,
            message: displayText,
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          }),
        })

        const resPayload = (await response.json().catch(() => ({}))) as Record<string, unknown>
        if (!response.ok) {
          throw new Error(toStringValue(resPayload.error, 'Unable to send message'))
        }

        if (resPayload.suppressed === true && typeof resPayload.privateChimmyNotice === 'string') {
          setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
          toast.info(resPayload.privateChimmyNotice)
          return
        }

        const serverMessage = mapLeagueApiMessage(resPayload.message)
        const rawExtras = resPayload.extraMessages
        const extraParsed = Array.isArray(rawExtras)
          ? rawExtras
              .map((m) => mapLeagueApiMessage(m))
              .filter((m): m is LeagueChatMessage => Boolean(m))
          : []

        setMessages((current) => {
          const merged = current.map((message) =>
            message.id === optimisticMessage.id ? serverMessage ?? optimisticMessage : message
          )
          return extraParsed.length ? [...merged, ...extraParsed] : merged
        })
      } catch (err) {
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
        showTimedError(err instanceof Error ? err.message : 'Unable to send message')
      } finally {
        setSending(false)
      }
    },
    [clearError, selectedLeague.id, showTimedError, userDisplayName, userId, userImage]
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[13px] text-white/40">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div>
            {messages.map((message, index) => {
              const meta = message.metadata
              const isChimmyBubble =
                meta?.chimmy === true && (meta?.bigBrother === true || meta?.idp === true)
              const isVoteProgress = meta?.bbVoteProgress === true
              const urgency = meta?.urgency === true
              const displayName =
                isChimmyBubble ? 'Chimmy' : message.author_display_name
              const isSystemLine =
                !isChimmyBubble &&
                !isVoteProgress &&
                (message.author_display_name === 'AllFantasy' ||
                  message.messageType === 'system' ||
                  (meta && typeof meta.isSystem === 'boolean' && meta.isSystem === true))

              const gifDisplay = meta ? getGifDisplay(meta) : null

              if (message.isActivity) {
                return (
                  <p key={message.id} className="mt-2 px-2 py-1 text-center text-[11px] text-white/35">
                    <span className="italic">{message.activityText}</span>
                    {message.playerName ? (
                      <span className="font-semibold not-italic text-cyan-400/90"> {message.playerName}</span>
                    ) : null}
                  </p>
                )
              }

              if (isVoteProgress) {
                return (
                  <div
                    key={message.id}
                    className={`mx-auto my-1 max-w-[95%] rounded-xl border px-3 py-2 text-center text-[12px] ${
                      urgency
                        ? 'border-amber-500/50 bg-amber-950/25 text-amber-100'
                        : 'border-sky-500/30 bg-[#0a1228]/90 text-sky-100/90'
                    }`}
                    data-testid="bb-vote-progress-line"
                  >
                    {message.text}
                  </div>
                )
              }

              if (isSystemLine) {
                return (
                  <p
                    key={message.id}
                    className="px-1 py-1 text-center text-[11px] text-white/35 italic"
                  >
                    {message.text}
                  </p>
                )
              }

              if (isChimmyBubble) {
                return (
                  <div key={message.id} className="mt-2 flex items-start gap-2 py-1.5">
                    <div className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-200">
                      C
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex min-w-0 items-baseline">
                        <span className="text-[13px] font-semibold text-cyan-200/90">{displayName}</span>
                        <span className="ml-1.5 shrink-0 text-[11px] text-white/30">
                          {formatChatTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-cyan-500/20 bg-[#0a1228] px-3 py-2 text-[13px] text-white/90">
                        {message.text}
                      </div>
                    </div>
                  </div>
                )
              }

              const isOutgoing = message.authorId === userId
              const prev = index > 0 ? messages[index - 1] : undefined
              const prevSystem =
                prev &&
                (prev.author_display_name === 'AllFantasy' ||
                  prev.messageType === 'system' ||
                  (prev.metadata && typeof prev.metadata.isSystem === 'boolean' && prev.metadata.isSystem === true) ||
                  !prev.author_display_name.trim())
              const threaded =
                prev &&
                !prev.isActivity &&
                !prevSystem &&
                isLeagueMessageThreaded(
                  { authorId: prev.authorId, created: prev.created },
                  { authorId: message.authorId, created: message.created }
                )

              const groupGap = threaded ? 'mt-0.5' : 'mt-2'

              if (isOutgoing) {
                return (
                  <div key={message.id} className={`flex justify-end py-1.5 ${index > 0 ? groupGap : ''}`}>
                    <div className="ml-auto flex min-w-0 max-w-[82%] flex-col items-end">
                      <div className="rounded-2xl rounded-tr-sm border border-cyan-500/25 bg-cyan-500/15 px-3 py-2 text-[13px] text-white">
                        {gifDisplay ? <GifWithAttribution gif={gifDisplay} /> : null}
                        {message.text ? <p className="leading-relaxed">{message.text}</p> : null}
                      </div>
                      <span className="mt-0.5 text-right text-[11px] text-white/25">
                        {formatChatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 py-1.5 ${index > 0 ? groupGap : ''}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {threaded ? (
                      <div className="h-[26px] w-[26px]" aria-hidden />
                    ) : (
                      <ChatSenderAvatar
                        size={26}
                        authorAvatar={message.author_avatar}
                        authorDisplayName={displayName}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {threaded ? null : (
                      <div className="mb-0.5 flex min-w-0 items-baseline">
                        <span className="min-w-0 truncate text-[13px] font-semibold text-white/55">
                          {displayName}
                        </span>
                        <span className="ml-1.5 shrink-0 text-[11px] text-white/30">
                          {formatChatTime(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.07] px-3 py-2 text-[13px] text-white/90">
                      {gifDisplay ? <GifWithAttribution gif={gifDisplay} /> : null}
                      {message.text ? <p className="leading-relaxed">{message.text}</p> : null}
                    </div>
                    {threaded ? (
                      <p className="mt-0.5 text-[11px] text-white/30">{formatChatTime(message.createdAt)}</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-[#0a0a1f] px-2.5 py-2">
        {error ? <p className="mb-1.5 text-[11px] text-rose-300">{error}</p> : null}
        <ChatComposer
          leagueId={selectedLeague.id}
          onSend={handleComposerSend}
          placeholder="Message league..."
          onAskChimmy={onAskChimmy}
          initialDraftText={queryPrefill ?? zombieChimmyPrefill ?? null}
          bigBrotherAutocompleteLeagueId={
            selectedLeague.leagueVariant === 'big_brother' ? selectedLeague.id : null
          }
          idpAutocompleteLeagueId={
            selectedLeague.leagueVariant &&
            ['idp', 'IDP', 'DYNASTY_IDP', 'dynasty_idp'].includes(selectedLeague.leagueVariant)
              ? selectedLeague.id
              : null
          }
        />
        {sending ? <p className="mt-1 text-[11px] text-white/35">Sending…</p> : null}
      </div>
    </div>
  )
}
