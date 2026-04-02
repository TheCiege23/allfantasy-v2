'use client'

import { Send, Smile } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'
import { LeagueListPanel } from './LeagueListPanel'
import type { AFChatTab, UserLeague } from '../types'

type AFChatPanelProps = {
  selectedLeague: UserLeague | null
  userId: string
  leagues?: UserLeague[]
  onSelectLeague?: (league: UserLeague) => void
  loadingLeagues?: boolean
}

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
}

const CHAT_TABS: Array<{ id: AFChatTab; label: string }> = [
  { id: 'chimmy', label: '🤖 Chimmy' },
  { id: 'direct', label: '👤 Direct' },
  { id: 'groups', label: '👥 Groups' },
  { id: 'league', label: '🏈 League' },
]

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function safeParseSystemMessage(message: string) {
  try {
    const parsed: unknown = JSON.parse(message)
    const data = toRecord(parsed)
    if (data?.isSystem === true) {
      return {
        content: toStringValue(data.content, 'League activity'),
      }
    }
  } catch {}

  return null
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

function buildStubMessages(leagueName: string): LeagueChatMessage[] {
  const now = Date.now()
  return [
    {
      id: `${leagueName}-stub-1`,
      authorId: 'system',
      authorName: 'AllFantasy',
      authorAvatar: null,
      text: '',
      isActivity: true,
      activityText: 'Waiver activity: added ',
      playerName: 'Jordan Addison',
      createdAt: new Date(now - 18 * 60_000).toISOString(),
    },
    {
      id: `${leagueName}-stub-2`,
      authorId: 'system',
      authorName: 'AllFantasy',
      authorAvatar: null,
      text: '',
      isActivity: true,
      activityText: 'Trade block update for ',
      playerName: 'Brandon Aiyuk',
      createdAt: new Date(now - 43 * 60_000).toISOString(),
    },
    {
      id: `${leagueName}-stub-3`,
      authorId: 'system',
      authorName: 'AllFantasy',
      authorAvatar: null,
      text: '',
      isActivity: true,
      activityText: 'League pulse moved around ',
      playerName: '2027 1st',
      createdAt: new Date(now - 95 * 60_000).toISOString(),
    },
  ]
}

function mapBracketMessage(rawValue: unknown): LeagueChatMessage | null {
  const raw = toRecord(rawValue)
  if (!raw) return null

  const id = toStringValue(raw.id)
  const createdAt = toStringValue(raw.createdAt, new Date().toISOString())
  const rawMessage = toStringValue(raw.message)
  const user = toRecord(raw.user)
  const displayName =
    toStringValue(user?.displayName) ||
    toStringValue(user?.email).split('@')[0] ||
    'Manager'

  const systemMessage = safeParseSystemMessage(rawMessage)
  if (systemMessage) {
    return {
      id: id || `system-${createdAt}`,
      authorId: 'system',
      authorName: 'AllFantasy',
      authorAvatar: null,
      text: '',
      isActivity: true,
      activityText: systemMessage.content,
      createdAt,
    }
  }

  return {
    id: id || `msg-${createdAt}`,
    authorId: toStringValue(user?.id, 'unknown'),
    authorName: displayName,
    authorAvatar: toStringValue(user?.avatarUrl) || null,
    text: rawMessage,
    isActivity: false,
    createdAt,
  }
}

function EmptyTabState({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6 text-center">
      <div>
        <div className="text-[24px]">{icon}</div>
        <p className="mt-3 text-[12px] font-semibold text-white/35">{title}</p>
        <p className="mt-1 text-[12px] text-white/30">{subtitle}</p>
      </div>
    </div>
  )
}

function LeagueChatTab({
  selectedLeague,
  userId,
  onAskChimmy,
}: {
  selectedLeague: UserLeague | null
  userId: string
  onAskChimmy: () => void
}) {
  const [messages, setMessages] = useState<LeagueChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
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
    if (!selectedLeague) {
      setMessages([])
      return
    }

    setLoading(true)
    clearError()

    try {
      const response = await fetch(
        `/api/bracket/leagues/${encodeURIComponent(selectedLeague.id)}/chat?limit=50`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        throw new Error('Bracket chat unavailable for this league')
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const rawMessages = Array.isArray(payload.messages) ? payload.messages : []
      const nextMessages = rawMessages
        .map((message) => mapBracketMessage(message))
        .filter((message): message is LeagueChatMessage => Boolean(message))

      setMessages(nextMessages)
    } catch {
      // TODO: wire to league chat API
      setMessages(buildStubMessages(selectedLeague.name))
    } finally {
      setLoading(false)
    }
  }, [clearError, selectedLeague])

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

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!selectedLeague || !text || sending) return

    clearError()
    setSending(true)
    setInputValue('')

    const optimisticMessage: LeagueChatMessage = {
      id: `temp-${Date.now()}`,
      authorId: userId,
      authorName: 'You',
      authorAvatar: null,
      text,
      isActivity: false,
      createdAt: new Date().toISOString(),
    }

    setMessages((current) => [...current, optimisticMessage])

    try {
      const response = await fetch(`/api/bracket/leagues/${encodeURIComponent(selectedLeague.id)}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          message: text,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        throw new Error(toStringValue(payload.error, 'Unable to send message'))
      }

      const serverMessage = mapBracketMessage(payload.message)
      setMessages((current) =>
        current.map((message) => (message.id === optimisticMessage.id ? serverMessage ?? optimisticMessage : message))
      )
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
      showTimedError(error instanceof Error ? error.message : 'Unable to send message')
    } finally {
      setSending(false)
    }
  }, [clearError, inputValue, selectedLeague, sending, showTimedError, userId])

  if (!selectedLeague) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[11px] text-white/30">
        Select a league to see its chat
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const avatarUrl = resolveAvatarUrl(message.authorAvatar)
              return (
                <div key={message.id} className="flex gap-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[9px] font-semibold text-white/60">
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
                      <p className="mt-1 text-[11px] leading-relaxed text-white/70">{message.text}</p>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Coming soon"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-white/50"
          >
            <Smile className="h-4 w-4" />
          </button>

          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Message league..."
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-white outline-none placeholder:text-white/30"
          />

          <button
            type="button"
            onClick={onAskChimmy}
            className="rounded-md bg-violet-500/20 px-2 py-1 text-[9px] font-bold text-violet-300"
          >
            Ask Chimmy
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || sending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cyan-500 disabled:opacity-40"
            aria-label="Send league message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AFChatPanel({
  selectedLeague,
  userId,
  leagues = [],
  onSelectLeague,
  loadingLeagues = false,
}: AFChatPanelProps) {
  const [activeTab, setActiveTab] = useState<AFChatTab>(selectedLeague ? 'league' : 'chimmy')

  useEffect(() => {
    setActiveTab(selectedLeague ? 'league' : 'chimmy')
  }, [selectedLeague])

  const tabContent = useMemo(() => {
    if (activeTab === 'chimmy') {
      return (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChimmyChat />
        </div>
      )
    }

    if (activeTab === 'direct') {
      return (
        <EmptyTabState
          icon="💬"
          title="No direct messages yet"
          subtitle="Start a conversation with another manager"
        />
      )
    }

    if (activeTab === 'groups') {
      return (
        <EmptyTabState
          icon="👥"
          title="No group chats yet"
          subtitle="Create a group with your league managers"
        />
      )
    }

    return (
      <LeagueChatTab
        selectedLeague={selectedLeague}
        userId={userId}
        onAskChimmy={() => setActiveTab('chimmy')}
      />
    )
  }, [activeTab, selectedLeague, userId])

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-l border-white/[0.07] bg-[#0a0a1f]">
      <div className={`flex min-h-0 flex-col ${selectedLeague ? 'h-[calc(100%-200px)]' : 'h-full'}`}>
        <div className="flex border-b border-white/[0.07] bg-[#0a0a1f]">
          {CHAT_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const isDisabled = tab.id === 'league' && selectedLeague === null

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    setActiveTab(tab.id)
                  }
                }}
                className={`flex-1 py-2 text-center text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-white'
                    : 'text-white/40 hover:text-white/60'
                } ${isDisabled ? 'pointer-events-none opacity-30' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1">{tabContent}</div>
      </div>

      {selectedLeague ? (
        <div className="h-[200px] flex-shrink-0 border-t border-white/[0.07]">
          <LeagueListPanel
            leagues={leagues}
            selectedId={selectedLeague.id}
            onSelect={onSelectLeague ?? (() => undefined)}
            compact
            loading={loadingLeagues}
          />
        </div>
      ) : null}
    </div>
  )
}
