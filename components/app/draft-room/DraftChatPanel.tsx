'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Megaphone } from 'lucide-react'

export type DraftChatMessage = {
  id: string
  from: string
  text: string
  at: string
  isBroadcast?: boolean
  /** Entry point for @mention display */
  mentions?: string[]
}

export type DraftChatPanelProps = {
  messages: DraftChatMessage[]
  onSend: (text: string) => void
  sending?: boolean
  /** League-specific: draft chat syncs with league chat when true */
  leagueChatSync?: boolean
  /** Commissioner: show broadcast entry point */
  isCommissioner?: boolean
  onBroadcast?: () => void
  /** Refetch/reconnect entry; call when reconnecting */
  onReconnect?: () => void
  disabled?: boolean
}

export function DraftChatPanel({
  messages,
  onSend,
  sending = false,
  leagueChatSync = false,
  isCommissioner = false,
  onBroadcast,
  onReconnect,
  disabled = false,
}: DraftChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || sending || disabled) return
    onSend(text)
    setInput('')
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#060d1e]" data-testid="draft-chat-panel">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="text-sm font-semibold text-white truncate">Draft chat</span>
          {leagueChatSync && (
            <span className="rounded border border-cyan-300/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-100 shrink-0">
              League sync
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      <div className="flex min-h-[120px] max-h-[280px] sm:max-h-[220px] flex-1 flex-col overflow-y-auto overscroll-contain p-3">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-white/50">
            No messages yet. Chat is open during the draft.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                m.isBroadcast ? 'border-amber-400/30 bg-amber-500/10' : 'border-white/8 bg-[#0a1228]'
              }`}
            >
              <span className="font-medium text-cyan-300">{m.from}</span>
              {m.isBroadcast && <span className="ml-1 text-[9px] text-amber-400">(broadcast)</span>}
              <span className="text-white/90"> {m.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-white/8 p-3 sm:p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Message… (@mention supported)"
          disabled={disabled}
          className="flex-1 min-h-[44px] rounded-xl border border-white/12 bg-[#0a1228] px-3 py-2.5 text-sm text-white placeholder:text-white/40 disabled:opacity-50 touch-manipulation"
          aria-label="Chat message"
          data-testid="draft-chat-input"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending || disabled || !input.trim()}
          data-testid="draft-chat-send"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 touch-manipulation"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
