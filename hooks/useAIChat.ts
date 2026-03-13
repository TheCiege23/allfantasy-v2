"use client"

import { useCallback, useState } from "react"

export type AIChatMessage = { role: "user" | "assistant"; content: string }

export function useAIChat(options?: { leagueId?: string; contextScope?: { sleeper_username?: string } }) {
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || loading) return

      setError(null)
      setMessages((prev) => [...prev, { role: "user", content: trimmed }])
      setLoading(true)

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversation_history: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
            context_scope: options?.contextScope ?? { sleeper_username: "user", include_legacy: true },
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const errMsg = data?.error || data?.message || "AI request failed"
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }])
          setError(errMsg)
          return
        }

        const assistantContent =
          typeof data?.reply === "string"
            ? data.reply
            : data?.choices?.[0]?.message?.content ?? data?.message ?? "No response."
        setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }])
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Network error"
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }])
        setError(errMsg)
      } finally {
        setLoading(false)
      }
    },
    [loading, messages, options?.contextScope]
  )

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, loading, error, send, clear }
}
