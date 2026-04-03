'use client'

import { useCallback, useEffect, useState } from 'react'

type Msg = {
  id: string
  authorDisplayName: string | null
  message: string
  type: string
  createdAt: string
}

type Props = {
  sessionId: string
  mode: 'mock' | 'live'
}

export function DraftChatPanel({ sessionId, mode }: Props) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/draft/chat/history?sessionId=${encodeURIComponent(sessionId)}`)
    const j = (await r.json()) as { messages?: Msg[] }
    setMessages(j.messages ?? [])
  }, [sessionId])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 4000)
    return () => window.clearInterval(id)
  }, [load])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    await fetch('/api/draft/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: t, mode }),
    })
    void load()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1117]">
      <div className="border-b border-white/[0.06] px-2 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Draft chat</p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 text-[11px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.type === 'system' ? 'text-center text-[10px] text-cyan-300/80' : 'text-white/80'}
          >
            {m.type !== 'system' ? <span className="font-semibold text-white/60">{m.authorDisplayName}: </span> : null}
            {m.message}
          </div>
        ))}
      </div>
      <div className="flex gap-1 border-t border-white/[0.06] p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="Message…"
          className="min-w-0 flex-1 rounded border border-white/[0.08] bg-black/30 px-2 py-1 text-[11px] text-white"
        />
        <button
          type="button"
          onClick={() => void send()}
          className="rounded bg-cyan-500 px-3 py-1 text-[11px] font-bold text-black"
        >
          Send
        </button>
      </div>
    </div>
  )
}
