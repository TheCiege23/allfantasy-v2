'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserLeague } from '../types'
import { ChatComposer, type LeagueComposerPayload } from './chat/ChatComposer'

type LeagueChatMessage = {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string | null
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

function buildRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'just now'

  const diffMs = Date.now() - timestamp
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}

function resolveAvatarUrl(value: string | null) {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  return `https://sleepercdn.com/avatars/${value}`
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'AF'
  )
}

function mapLeagueApiMessage(raw: unknown): LeagueChatMessage | null {
  const o = toRecord(raw)
  if (!o) return null
  const id = toStringValue(o.id)
  if (!id) return null
  const meta = toRecord(o.metadata)
  return {
    id,
    authorId: toStringValue(o.authorId, 'unknown'),
    authorName: toStringValue(o.authorName, 'Manager'),
    authorAvatar: typeof o.authorAvatar === 'string' || o.authorAvatar === null ? (o.authorAvatar as string | null) : null,
    text: toStringValue(o.text),
    isActivity: false,
    createdAt: toStringValue(o.createdAt, new Date().toISOString()),
    metadata: meta,
  }
}

type LeagueChatInPanelProps = {
  selectedLeague: UserLeague
  userId: string
  onAskChimmy: () => void
}

/**
 * League chat thread (left panel / AF Chat league tab).
 * Uses `/api/league/chat` (main app League + LeagueChatMessage).
 */
export function LeagueChatInPanel({ selectedLeague, userId, onAskChimmy }: LeagueChatInPanelProps) {
  const [messages, setMessages] = useState<LeagueChatMessage[]>([])
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

      const optimisticMessage: LeagueChatMessage = {
        id: `temp-${Date.now()}`,
        authorId: userId,
        authorName: 'You',
        authorAvatar: null,
        text: displayText,
        isActivity: false,
        createdAt: new Date().toISOString(),
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

        const serverMessage = mapLeagueApiMessage(resPayload.message)
        setMessages((current) =>
          current.map((message) => (message.id === optimisticMessage.id ? serverMessage ?? optimisticMessage : message))
        )
      } catch (err) {
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
        showTimedError(err instanceof Error ? err.message : 'Unable to send message')
      } finally {
        setSending(false)
      }
    },
    [clearError, selectedLeague.id, showTimedError, userId]
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12px] text-white/40">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const avatarUrl = resolveAvatarUrl(message.authorAvatar)
              const meta = message.metadata
              const gifPreview =
                meta && typeof meta.previewUrl === 'string'
                  ? meta.previewUrl
                  : meta && typeof meta.gifUrl === 'string'
                    ? meta.gifUrl
                    : null
              return (
                <div key={message.id} className="flex gap-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-[26px] w-[26px] shrink-0 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-semibold text-white/60">
                      {getInitials(message.authorName)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] text-white/30">
                      {message.authorName} · {buildRelativeTime(message.createdAt)}
                    </div>
                    {message.isActivity ? (
                      <p className="mt-1 text-[10px] italic text-white/45">
                        {message.activityText}
                        {message.playerName ? (
                          <span className="font-semibold not-italic text-cyan-400">{message.playerName}</span>
                        ) : null}
                      </p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {gifPreview ? (
                          <img
                            src={gifPreview}
                            alt=""
                            className="max-h-32 max-w-[200px] rounded-lg border border-white/10 object-cover"
                          />
                        ) : null}
                        <p className="text-[11px] leading-relaxed text-white/70">{message.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.07] px-2.5 py-2">
        {error ? <p className="mb-1.5 text-[10px] text-rose-300">{error}</p> : null}
        <div className="flex items-end gap-2">
          <ChatComposer
            leagueId={selectedLeague.id}
            onSend={handleComposerSend}
            placeholder="Message league..."
          />
          <button
            type="button"
            onClick={onAskChimmy}
            className="shrink-0 rounded-md bg-violet-500/20 px-2 py-1.5 text-[9px] font-bold text-violet-300"
          >
            Ask Chimmy
          </button>
        </div>
        {sending ? <p className="mt-1 text-[9px] text-white/35">Sending…</p> : null}
      </div>
    </div>
  )
}
