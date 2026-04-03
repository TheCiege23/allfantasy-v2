'use client'

import { useCallback, useState } from 'react'

const BTNS = [
  { label: 'Best Pick Available', path: '/api/draft/ai/best-pick' },
  { label: 'Who Fits My Roster', path: '/api/draft/ai/roster-fit' },
  { label: 'Scarcity Alert', path: '/api/draft/ai/scarcity' },
  { label: 'Will They Be There?', path: '/api/draft/ai/pick-survival' },
  { label: 'Grade My Draft So Far', path: '/api/draft/ai/grade' },
] as const

type Props = {
  sessionId: string
  context: Record<string, unknown>
}

export function ChimmyDraftChat({ sessionId, context }: Props) {
  const [lines, setLines] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const run = useCallback(
    async (path: string, extra?: Record<string, unknown>) => {
      setLoading(true)
      try {
        const r = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, ...context, ...extra }),
        })
        const j = (await r.json()) as { result?: unknown; error?: string }
        const text = j.error ?? JSON.stringify(j.result ?? j, null, 2)
        setLines((prev) => [...prev, { role: 'assistant', text }])
      } catch (e) {
        setLines((prev) => [...prev, { role: 'assistant', text: String(e) }])
      } finally {
        setLoading(false)
      }
    },
    [sessionId, context],
  )

  const sendCustom = async () => {
    const t = input.trim()
    if (!t) return
    setInput('')
    setLines((prev) => [...prev, { role: 'user', text: t }])
    setLoading(true)
    try {
      const r = await fetch('/api/draft/ai/best-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question: t, ...context }),
      })
      const j = (await r.json()) as { result?: unknown; error?: string }
      setLines((prev) => [...prev, { role: 'assistant', text: j.error ?? JSON.stringify(j.result ?? j) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1117]">
      <div className="border-b border-white/[0.06] px-2 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">Chimmy ✨</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {BTNS.map((b) => (
            <button
              key={b.path}
              type="button"
              disabled={loading}
              onClick={() => void run(b.path)}
              className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium text-cyan-200/90"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 text-[11px]">
        {lines.map((l, i) => (
          <div
            key={i}
            className={l.role === 'user' ? 'ml-4 rounded-lg bg-white/[0.06] px-2 py-1 text-white/90' : 'text-white/70'}
          >
            {l.text}
          </div>
        ))}
        {loading ? <p className="text-[10px] text-white/40">Thinking…</p> : null}
      </div>
      <div className="flex gap-1 border-t border-white/[0.06] p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void sendCustom()}
          placeholder="Ask Chimmy…"
          className="min-w-0 flex-1 rounded border border-white/[0.08] bg-black/30 px-2 py-1 text-[11px] text-white"
        />
        <button
          type="button"
          onClick={() => void sendCustom()}
          className="rounded bg-cyan-500/80 px-3 py-1 text-[11px] font-bold text-black"
        >
          Send
        </button>
      </div>
    </div>
  )
}
