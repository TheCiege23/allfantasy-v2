"use client"

import { useState } from "react"

export default function ChatWindow({ title, seedMessages }: { title: string; seedMessages?: string[] }) {
  const [messages, setMessages] = useState<string[]>(seedMessages || [])
  const [text, setText] = useState("")

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-sm font-semibold text-white mb-2">{title}</div>
      <div className="h-48 overflow-y-auto space-y-2 rounded-lg border border-white/10 bg-black/30 p-2">
        {messages.length === 0 ? <p className="text-xs text-white/40">No messages yet.</p> : messages.map((m, i) => <p key={`${m}-${i}`} className="text-xs text-white/80">{m}</p>)}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white" placeholder="Type a message" />
        <button type="button" onClick={() => { if (text.trim()) { setMessages((m) => [...m, text.trim()]); setText("") } }} className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200">Send</button>
      </div>
    </div>
  )
}
