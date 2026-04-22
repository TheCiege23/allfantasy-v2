'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { MessageCircle, Send, Megaphone, Link2, ImageIcon, Film, Smile, BarChart3 } from 'lucide-react'
import type { DraftChatWireMessage } from '@/lib/draft-room/draft-chat-contract'

export type DraftChatReaction = {
  emoji: string
  count: number
  userIds: string[]
}

/** Draft room chat wire shape from `/api/leagues/[leagueId]/draft/chat`. */
export type DraftChatMessage = DraftChatWireMessage

const DEFAULT_REACTION_PICKER = ['👍', '❤️', '🔥', '😂', '👀', '🎯'] as const
const COMPOSER_EMOJI_QUICK = ['😂', '🔥', '👍', '❤️', '🎯', '🏈', '⚡️', '😬'] as const

export type DraftChatPanelProps = {
  messages: DraftChatMessage[]
  onSend: (text: string) => void
  sending?: boolean
  /** League-specific: draft chat syncs with league chat when true */
  leagueChatSync?: boolean
  /** Commissioner: show broadcast entry point */
  isCommissioner?: boolean
  onBroadcast?: () => void
  onAiSuggestionClick?: () => void
  /** Refetch/reconnect entry; call when reconnecting */
  onReconnect?: () => void
  disabled?: boolean
  /** Current viewer's appUserId — enables highlighting self-reactions and toggling. */
  currentUserId?: string | null
  /**
   * Toggle a reaction on a message. When the user has already reacted with
   * this emoji, the server-side route removes it; otherwise adds it. The
   * panel fires optimistic UI and relies on the next message refetch to
   * reconcile counts, so this handler should kick off both the POST and a
   * refetch signal in the parent.
   */
  onReact?: (messageId: string, emoji: string) => void
  presentationVariant?: 'default' | 'redraft_snake'
  /** Last chat POST failure — cleared on successful send */
  sendError?: string | null
  onDismissSendError?: () => void
  /** Required for poll create / vote API wiring */
  leagueId?: string | null
}

export function DraftChatPanel({
  messages,
  onSend,
  sending = false,
  leagueChatSync = false,
  isCommissioner = false,
  onBroadcast,
  onAiSuggestionClick,
  onReconnect,
  disabled = false,
  currentUserId = null,
  onReact,
  presentationVariant = 'default',
  sendError = null,
  onDismissSendError,
  leagueId = null,
}: DraftChatPanelProps) {
  const rs = presentationVariant === 'redraft_snake'
  const [input, setInput] = useState('')
  const [openPickerMessageId, setOpenPickerMessageId] = useState<string | null>(null)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptionsText, setPollOptionsText] = useState('')
  const [pollSending, setPollSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickBottomRef = useRef(true)
  const participantHandles = useMemo(() => {
    const names = Array.from(new Set(messages.map((m) => String(m.from || '').trim()).filter(Boolean)))
    return names.slice(0, 8)
  }, [messages])

  const insertToken = (token: string) => {
    if (disabled) return
    setInput((prev) => `${prev}${prev ? ' ' : ''}${token}`.trimStart())
  }

  const insertMedia = (kind: 'GIF' | 'IMAGE' | 'VIDEO' | 'LINK') => {
    if (disabled) return
    const raw = window.prompt(`Paste ${kind.toLowerCase()} URL (optional):`) || ''
    const url = raw.trim()
    if (!url) {
      insertToken(`[${kind}]`)
      return
    }
    insertToken(`[${kind}] ${url}`)
  }

  useEffect(() => {
    if (!stickBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: rs ? 'auto' : 'smooth' })
  }, [messages, rs])

  const handleScrollLog = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    stickBottomRef.current = gap < 96
  }, [])

  const insertEmoji = (emoji: string) => {
    if (disabled) return
    setInput((prev) => `${prev}${emoji}`)
  }

  const submitPoll = async () => {
    if (!leagueId || disabled || pollSending) return
    const question = pollQuestion.trim()
    const options = pollOptionsText
      .split(/\n+/)
      .map((o) => o.trim())
      .filter(Boolean)
    if (question.length < 2 || options.length < 2) return
    setPollSending(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll: { question, options } }),
      })
      if (res.ok) {
        setPollQuestion('')
        setPollOptionsText('')
        setPollOpen(false)
        onReconnect?.()
      }
    } finally {
      setPollSending(false)
    }
  }

  const votePoll = async (messageId: string, optionIndex: number) => {
    if (!leagueId || disabled) return
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/chat/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, optionIndex }),
      })
      if (res.ok) onReconnect?.()
    } catch {
      /* refetch on next poll tick */
    }
  }

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || sending || disabled) return
    onSend(text)
    setInput('')
  }

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9._-]+)/g)
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <span key={`${part}-${index}`} className="font-medium text-cyan-200">
                {part}
              </span>
            )
          }
          return <span key={`${part}-${index}`}>{part}</span>
        })}
      </>
    )
  }

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border bg-[#060d1e] ${
        rs ? 'border-cyan-500/20 shadow-[0_12px_44px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(34,211,238,0.06)]' : 'border-white/10'
      }`}
      data-testid="draft-chat-panel"
    >
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${rs ? 'border-cyan-500/12 bg-[linear-gradient(90deg,rgba(34,211,238,0.06),transparent)]' : 'border-white/8'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="text-sm font-semibold text-white truncate">Draft chat</span>
          {leagueChatSync && (
            <span className="rounded border border-cyan-300/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-100 shrink-0" data-testid="draft-chat-sync-badge">
              League sync
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAiSuggestionClick && (
            <button
              type="button"
              onClick={onAiSuggestionClick}
              data-testid="draft-chat-ai-handoff"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/35 bg-cyan-500/10 px-2.5 py-2 text-[10px] text-cyan-100 hover:bg-cyan-500/20 touch-manipulation"
              aria-label="Open Chimmy AI"
            >
              Chimmy AI
            </button>
          )}
          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              data-testid="draft-chat-refresh"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-white/12 bg-black/20 px-2 py-2 text-xs text-white/75 hover:bg-white/10 touch-manipulation"
              aria-label="Refresh chat"
            >
              Refresh
            </button>
          )}
          {isCommissioner && onBroadcast && (
            <button
              type="button"
              onClick={onBroadcast}
              data-testid="draft-open-broadcast-button"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-500/20 touch-manipulation"
              aria-label="Commissioner broadcast"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Broadcast
            </button>
          )}
        </div>
      </div>
      {sendError ? (
        <div
          className="flex items-center justify-between gap-2 border-b border-rose-400/30 bg-rose-500/12 px-3 py-2 text-[11px] text-rose-100"
          role="alert"
        >
          <span>{sendError}</span>
          {onDismissSendError ? (
            <button
              type="button"
              onClick={onDismissSendError}
              className="rounded px-2 py-1 text-rose-200 hover:bg-rose-500/20"
              aria-label="Dismiss send error"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${
          rs ? 'border-cyan-500/15 bg-black/25' : 'border-white/8'
        }`}
      >
        <button
          type="button"
          onClick={() => insertMedia('GIF')}
          disabled={disabled}
          data-testid="draft-chat-media-gif"
          className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50 ${
            rs
              ? 'border-cyan-400/25 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-950/60'
              : 'border-white/12 bg-black/20 text-white/75 hover:bg-white/10'
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          GIF
        </button>
        <button
          type="button"
          onClick={() => insertMedia('IMAGE')}
          disabled={disabled}
          data-testid="draft-chat-media-image"
          className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50 ${
            rs
              ? 'border-white/14 bg-black/35 text-white/85 hover:bg-black/50'
              : 'border-white/12 bg-black/20 text-white/75 hover:bg-white/10'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Image
        </button>
        <button
          type="button"
          onClick={() => insertMedia('VIDEO')}
          disabled={disabled}
          data-testid="draft-chat-media-video"
          className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50 ${
            rs
              ? 'border-white/14 bg-black/35 text-white/85 hover:bg-black/50'
              : 'border-white/12 bg-black/20 text-white/75 hover:bg-white/10'
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          Video
        </button>
        <button
          type="button"
          onClick={() => insertMedia('LINK')}
          disabled={disabled}
          data-testid="draft-chat-media-link"
          className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50 ${
            rs
              ? 'border-white/14 bg-black/35 text-white/85 hover:bg-black/50'
              : 'border-white/12 bg-black/20 text-white/75 hover:bg-white/10'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Link
        </button>
        {leagueId ? (
          <button
            type="button"
            onClick={() => setPollOpen((v) => !v)}
            disabled={disabled}
            data-testid="draft-chat-poll-toggle"
            className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50 ${
              pollOpen
                ? 'border-violet-400/45 bg-violet-500/20 text-violet-100'
                : rs
                  ? 'border-violet-400/30 bg-violet-950/35 text-violet-100 hover:bg-violet-950/55'
                  : 'border-violet-400/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Poll
          </button>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {isCommissioner && (
            <button
              type="button"
              onClick={() => insertToken('@everyone')}
              disabled={disabled}
              data-testid="draft-chat-mention-everyone"
              className="min-h-[36px] rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
            >
              @everyone
            </button>
          )}
          {participantHandles.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => insertToken(`@${name.replace(/\s+/g, '')}`)}
              disabled={disabled}
              data-testid={`draft-chat-mention-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="min-h-[36px] rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              @{name}
            </button>
          ))}
        </div>
      </div>
      {pollOpen && leagueId ? (
        <div
          className={`space-y-2 border-b px-3 py-2 ${rs ? 'border-cyan-500/15 bg-violet-950/20' : 'border-white/8 bg-violet-500/5'}`}
          data-testid="draft-chat-poll-composer"
        >
          <p className="text-[10px] font-medium text-white/70">Create a poll (syncs like a normal message when league sync is on)</p>
          <input
            type="text"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Question"
            disabled={disabled || pollSending}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white placeholder:text-white/40"
          />
          <textarea
            value={pollOptionsText}
            onChange={(e) => setPollOptionsText(e.target.value)}
            placeholder={'Options (one per line)\nRB heavy next round?\nWR run soon?'}
            disabled={disabled || pollSending}
            rows={3}
            className="w-full resize-y rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white placeholder:text-white/40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitPoll}
              disabled={disabled || pollSending || pollQuestion.trim().length < 2 || pollOptionsText.split(/\n/).filter((l) => l.trim()).length < 2}
              data-testid="draft-chat-poll-submit"
              className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-[11px] font-semibold text-violet-50 hover:bg-violet-500/30 disabled:opacity-50"
            >
              {pollSending ? 'Posting…' : 'Post poll'}
            </button>
            <button
              type="button"
              onClick={() => setPollOpen(false)}
              className="rounded-lg border border-white/12 px-3 py-2 text-[11px] text-white/75 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        onScroll={handleScrollLog}
        className={`flex min-h-[140px] flex-1 flex-col overflow-y-auto overscroll-contain p-3 ${
          rs ? 'min-h-[180px] max-h-[min(420px,42vh)] sm:max-h-[min(480px,48vh)] bg-[#040814]' : 'max-h-[280px] sm:max-h-[220px]'
        }`}
        role="log"
        aria-relevant="additions"
        aria-label="Draft chat messages"
      >
        {messages.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <p className={`text-[11px] font-medium ${rs ? 'text-white/80' : 'text-white/65'}`}>No messages yet</p>
            <p
              className={`mx-auto max-w-[280px] text-[10px] leading-relaxed ${rs ? 'text-white/55' : 'text-white/42'}`}
            >
              Say hi, drop a GIF, run a quick poll, or @mention managers. With league sync on, normal chatter also appears in
              your league chat — pick alerts stay in this draft room only.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.isDraftPickEvent) {
              const meta = m.draftPickMeta
              const when = meta?.pickedAt ? new Date(meta.pickedAt) : new Date(m.at)
              return (
                <div
                  key={m.id}
                  className={`mb-3 rounded-xl border px-3 py-2.5 text-[11px] shadow-lg ${
                    rs
                      ? 'border-emerald-400/35 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(6,12,28,0.98))] ring-1 ring-emerald-500/15'
                      : 'border-emerald-400/25 bg-emerald-500/10'
                  }`}
                  data-testid="draft-chat-pick-event"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/95">Pick</span>
                    <span className="text-[10px] text-white/55 tabular-nums">
                      {when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] font-semibold leading-snug text-white">
                    {meta?.playerName ?? m.text}
                    {meta?.position ? (
                      <span className="ml-1.5 text-[12px] font-medium text-white/65">{meta.position}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[12px] text-emerald-100/90">
                    <span className="text-white/50">To </span>
                    {meta?.rosterDisplayName ?? 'Team'}
                  </p>
                  {(meta?.pickLabel || meta?.overall != null || meta?.round != null) && (
                    <p className="mt-1.5 text-[10px] text-white/45">
                      {meta?.round != null && meta?.roundSlot != null ? (
                        <>
                          Round {meta.round} · Pick {meta.roundSlot}
                        </>
                      ) : meta?.pickLabel ? (
                        <>Round/pick {meta.pickLabel}</>
                      ) : null}
                      {meta?.overall != null ? <> · #{meta.overall} overall</> : null}
                      {meta?.nflTeam ? <> · {meta.nflTeam}</> : null}
                    </p>
                  )}
                </div>
              )
            }

            if (m.messageType === 'poll' && m.pollPayload?.question) {
              const pl = m.pollPayload
              const closed = Boolean(pl.closed)
              return (
                <div
                  key={m.id}
                  className={`mb-2.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                    rs
                      ? 'border-violet-400/35 bg-violet-950/35 ring-1 ring-violet-400/10'
                      : 'border-violet-400/25 bg-violet-500/10'
                  }`}
                  data-testid={`draft-chat-poll-${m.id}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-violet-100">{m.from}</span>
                    <span className="rounded border border-violet-400/30 bg-black/30 px-1 py-0.5 text-[9px] uppercase tracking-wide text-violet-100/90">
                      Poll
                    </span>
                    <span className="text-[9px] text-white/45">
                      {new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold text-white/95">{pl.question}</p>
                  <ul className="mt-2 space-y-1.5">
                    {pl.options.map((label, idx) => {
                      const key = String(idx)
                      const voters = pl.votes?.[key] ?? []
                      const count = Array.isArray(voters) ? voters.length : 0
                      const mine = Boolean(currentUserId && voters.includes(currentUserId))
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            disabled={disabled || closed || !leagueId}
                            onClick={() => votePoll(m.id, idx)}
                            className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-[11px] transition ${
                              mine
                                ? 'border-violet-400/50 bg-violet-500/20 text-white'
                                : 'border-white/10 bg-black/25 text-white/85 hover:bg-black/40'
                            } ${closed ? 'opacity-60' : ''}`}
                          >
                            <span>{label}</span>
                            <span className="tabular-nums text-white/55">{count}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {closed ? <p className="mt-1 text-[9px] text-white/45">Poll closed</p> : null}
                </div>
              )
            }

            return (
            <div
              key={m.id}
              className={`mb-2.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                m.isAiSuggestion && rs
                  ? 'border-cyan-400/35 bg-[linear-gradient(145deg,rgba(34,211,238,0.12),rgba(15,23,42,0.96))] shadow-[0_14px_40px_rgba(0,0,0,0.35)] ring-1 ring-cyan-400/12'
                  : m.isAiSuggestion
                    ? 'border-cyan-400/30 bg-cyan-500/10'
                    : m.isBroadcast
                      ? 'border-amber-400/30 bg-amber-500/10'
                      : m.messageCategory === 'COMMISSIONER_SYSTEM_MESSAGE'
                        ? rs
                          ? 'border-slate-400/35 bg-[linear-gradient(135deg,rgba(148,163,184,0.12),rgba(15,23,42,0.96))] ring-1 ring-slate-400/15'
                          : 'border-slate-400/28 bg-slate-500/10'
                      : rs
                        ? 'border-white/12 bg-[#0c162e] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                      : 'border-white/8 bg-[#0a1228]'
              }`}
              data-ai-suggestion={m.isAiSuggestion ? 'true' : undefined}
              data-message-category={m.messageCategory}
              data-sync-to-league={m.syncToLeagueChat ? 'true' : 'false'}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className={`font-semibold ${m.isAiSuggestion ? 'text-cyan-100' : 'text-cyan-300'}`}>{m.from}</span>
                {m.isAiSuggestion && (
                  <span className="rounded-full border border-cyan-400/25 bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100/90">
                    {m.messageType === 'copilot_prepare'
                      ? 'Prep'
                      : m.messageType === 'queue_conflict'
                        ? 'Queue'
                        : m.messageType === 'copilot_on_clock'
                          ? 'Live'
                          : 'Copilot'}
                  </span>
                )}
                {m.isBroadcast && <span className="text-[9px] text-amber-400">(broadcast)</span>}
                <span className="text-[9px] text-white/45">
                  {new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              {m.playerContext ? (
                <div className="mt-2 flex gap-2 rounded-lg border border-white/12 bg-black/30 p-2">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/40">
                    {m.playerContext.headshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.playerContext.headshotUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold uppercase text-white/35">
                        {(m.playerContext.playerName ?? '?')
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')}
                      </div>
                    )}
                    {m.playerContext.teamLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.playerContext.teamLogoUrl}
                        alt=""
                        className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded border border-black/40 bg-black/70 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-[11px] font-semibold text-white/92">
                      {m.playerContext.playerName ?? 'Player'}
                      {m.playerContext.position ? (
                        <span className="ml-1 font-normal text-white/55">{m.playerContext.position}</span>
                      ) : null}
                      {m.playerContext.team ? (
                        <span className="ml-1 font-normal text-cyan-200/70">{m.playerContext.team}</span>
                      ) : null}
                    </p>
                    {m.playerContext.statSummary ? (
                      <p className="truncate text-[10px] text-emerald-200/85">{m.playerContext.statSummary}</p>
                    ) : null}
                    {(m.playerContext.injuryStatus || m.playerContext.headlineSnippet) && (
                      <p className="truncate text-[10px] leading-snug text-amber-100/80">
                        {[m.playerContext.injuryStatus, m.playerContext.headlineSnippet].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              <p className={`mt-1.5 ${m.isAiSuggestion ? 'text-white/92' : 'text-white/90'}`}>{renderMessageText(m.text)}</p>
              {m.aiMetadata?.rationale ? (
                <p className="mt-2 border-l-2 border-cyan-400/35 pl-2 text-[10px] leading-snug text-white/72">
                  {m.aiMetadata.rationale}
                </p>
              ) : null}
              {m.aiMetadata?.confidence != null && Number.isFinite(m.aiMetadata.confidence) ? (
                <p className="mt-1 text-[9px] text-cyan-100/75">
                  Confidence{' '}
                  {m.aiMetadata.confidence <= 1
                    ? `${Math.round(m.aiMetadata.confidence * 100)}%`
                    : `${Math.round(m.aiMetadata.confidence)}%`}
                </p>
              ) : null}
              {m.aiMetadata?.actions?.length ? (
                <ul className="mt-2 space-y-1 text-[10px] text-cyan-100/85">
                  {m.aiMetadata.actions.map((a, i) => (
                    <li key={`${m.id}-ai-act-${i}`}>• {a.label}</li>
                  ))}
                </ul>
              ) : null}
              {(m.mediaUrl || m.thumbnailUrl) && (
                <div className="mt-2">
                  {['image', 'gif', 'meme'].includes(String(m.messageType || '').toLowerCase()) ||
                  (m.mediaKind && ['image', 'gif', 'meme'].includes(m.mediaKind)) ? (
                    <a
                      href={m.mediaUrl ?? m.thumbnailUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block"
                      data-testid={`draft-chat-media-preview-${m.id}`}
                    >
                      <img
                        src={m.mediaUrl ?? m.thumbnailUrl ?? ''}
                        alt="chat media"
                        className="max-h-28 rounded border border-white/15"
                      />
                    </a>
                  ) : (
                    <a
                      href={m.mediaUrl ?? m.thumbnailUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-200 underline"
                      data-testid={`draft-chat-media-preview-${m.id}`}
                    >
                      Open media
                    </a>
                  )}
                  {m.gifProvider ? (
                    <p className="mt-1 text-[9px] text-white/45">via {m.gifProvider}</p>
                  ) : null}
                </div>
              )}
              {m.lastActiveAt && (
                <div className="mt-1 text-[9px] text-white/45">
                  last active {new Date(m.lastActiveAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
              {m.isAiSuggestion && onAiSuggestionClick && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={onAiSuggestionClick}
                    data-testid="draft-chat-open-ai-helper"
                    className="rounded border border-cyan-300/35 bg-cyan-500/12 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
                  >
                    Open AI helper
                  </button>
                </div>
              )}
              {onReact && (m.reactions?.length || openPickerMessageId === m.id) ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1" data-testid={`draft-chat-reactions-${m.id}`}>
                  {(m.reactions ?? []).map((r) => {
                    const mine = Boolean(currentUserId && r.userIds.includes(currentUserId))
                    return (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => onReact(m.id, r.emoji)}
                        disabled={disabled}
                        data-testid={`draft-chat-reaction-${m.id}-${r.emoji}`}
                        data-reacted={mine ? 'true' : 'false'}
                        className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition ${
                          mine
                            ? 'border-cyan-300/50 bg-cyan-500/15 text-cyan-100'
                            : 'border-white/12 bg-black/25 text-white/75 hover:bg-white/10'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="tabular-nums">{r.count}</span>
                      </button>
                    )
                  })}
                  {openPickerMessageId === m.id ? (
                    <div
                      className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-black/40 px-1 py-0.5"
                      data-testid={`draft-chat-reaction-picker-${m.id}`}
                    >
                      {DEFAULT_REACTION_PICKER.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onReact(m.id, emoji)
                            setOpenPickerMessageId(null)
                          }}
                          disabled={disabled}
                          data-testid={`draft-chat-reaction-pick-${m.id}-${emoji}`}
                          className="rounded px-1 py-0.5 text-[11px] hover:bg-white/10"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOpenPickerMessageId(null)}
                        aria-label="Close reaction picker"
                        className="rounded px-1 py-0.5 text-[10px] text-white/50 hover:bg-white/10"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenPickerMessageId(m.id)}
                      disabled={disabled}
                      data-testid={`draft-chat-reaction-add-${m.id}`}
                      className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-white/55 hover:text-white/85"
                      aria-label="Add reaction"
                    >
                      <Smile className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : onReact ? (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setOpenPickerMessageId(m.id)}
                    disabled={disabled}
                    data-testid={`draft-chat-reaction-add-${m.id}`}
                    className="inline-flex items-center gap-0.5 rounded-full border border-white/8 bg-transparent px-1.5 py-0.5 text-[10px] text-white/40 hover:bg-white/5 hover:text-white/75"
                    aria-label="Add reaction"
                  >
                    <Smile className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div
        className={`flex flex-col gap-2 border-t p-3 sm:p-2.5 ${
          rs ? 'border-cyan-500/15 bg-[#050a14]' : 'border-white/8'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1">
          <span className={`mr-1 text-[9px] font-medium uppercase tracking-wide ${rs ? 'text-white/45' : 'text-white/35'}`}>
            Emoji
          </span>
          {COMPOSER_EMOJI_QUICK.map((emo) => (
            <button
              key={emo}
              type="button"
              onClick={() => insertEmoji(emo)}
              disabled={disabled}
              data-testid={`draft-chat-emoji-quick-${emo}`}
              className="rounded-md border border-white/10 bg-black/30 px-1.5 py-1 text-[14px] leading-none hover:bg-white/10 disabled:opacity-50"
              aria-label={`Insert ${emo}`}
            >
              {emo}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={
              rs
                ? 'Chat with the room… emojis, GIFs, polls, @mentions'
                : 'Message… (@mention supported)'
            }
            disabled={disabled}
            className={`flex-1 min-h-[48px] rounded-xl border px-3 py-3 text-base text-white placeholder:text-white/40 disabled:opacity-50 touch-manipulation ${
              rs
                ? 'border-cyan-400/25 bg-[#0a1428] shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]'
                : 'border-white/12 bg-[#0a1228]'
            }`}
            aria-label="Chat message"
            data-testid="draft-chat-input"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || disabled || !input.trim()}
            data-testid="draft-chat-send"
            className={`min-h-[48px] min-w-[52px] inline-flex items-center justify-center rounded-xl border text-cyan-100 disabled:opacity-50 touch-manipulation ${
              rs
                ? 'border-cyan-400/45 bg-cyan-500/18 shadow-[0_8px_28px_rgba(34,211,238,0.12)] hover:bg-cyan-500/28'
                : 'border-cyan-300/35 bg-cyan-500/12 hover:bg-cyan-500/20'
            }`}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
