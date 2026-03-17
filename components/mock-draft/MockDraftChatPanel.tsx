'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send } from 'lucide-react'

export interface MockDraftChatPanelProps {
  draftId: string
  pollIntervalMs?: number
}

type ChatMessage = {
  id: string
  userId: string | null
  displayName: string | null
  content: string
  createdAt: string
}

export function MockDraftChatPanel({ draftId, pollIntervalMs = 5000 }: MockDraftChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/mock-draft/${draftId}/chat`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!draftId) return
    fetchMessages()
    const id = setInterval(fetchMessages, pollIntervalMs)
    return () => clearInterval(id)
  }, [draftId, pollIntervalMs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/mock-draft/${draftId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages((prev) => [...prev, msg])
        setInput('')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-white/12 bg-black/25 text-xs">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <MessageCircle className="h-4 w-4 text-cyan-400" />
        <span className="font-medium text-white">Mock chat (isolated)</span>
      </header>
      <div className="flex min-h-[120px] max-h-[220px] flex-1 flex-col overflow-y-auto p-2">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-white/50">No messages yet. Mock chat does not sync with league chat.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-2 rounded-lg border border-white/5 bg-black/30 px-2 py-1.5">
              <span className="font-medium text-cyan-300">{m.displayName || 'User'}:</span>{' '}
              <span className="text-white/90">{m.content}</span>
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
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message..."
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-white placeholder:text-white/40"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1.5 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
