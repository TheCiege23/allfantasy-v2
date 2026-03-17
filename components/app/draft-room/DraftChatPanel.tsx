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
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/12 bg-black/25">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Draft chat</span>
          {leagueChatSync && (
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300">
              League sync
            </span>
          )}
        </div>
        {onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="text-[10px] text-cyan-400 hover:underline"
          >
            Refresh
          </button>
        )}
        {isCommissioner && onBroadcast && (
          <button
            type="button"
            onClick={onBroadcast}
            className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/25"
            aria-label="Commissioner broadcast"
          >
            <Megaphone className="h-3 w-3" />
            Broadcast
          </button>
        )}
      </div>
      <div className="flex min-h-[120px] max-h-[220px] flex-1 flex-col overflow-y-auto p-2">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-white/50">
            No messages yet. Chat is open during the draft.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 rounded-lg border px-2 py-1.5 text-[11px] ${
                m.isBroadcast ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/5 bg-black/30'
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
      <div className="flex gap-2 border-t border-white/10 p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Message… (@mention supported)"
          disabled={disabled}
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 disabled:opacity-50"
          aria-label="Chat message"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending || disabled || !input.trim()}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1.5 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
