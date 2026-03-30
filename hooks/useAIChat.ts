"use client"

import { useCallback, useState } from "react"

export type AIChatMessage = { role: "user" | "assistant"; content: string }

export function useAIChat(options?: {
  leagueId?: string
  sport?: string
  conversationId?: string
  privateMode?: boolean
  targetUsername?: string
  strategyMode?: string
  source?: string
  contextScope?: { sleeper_username?: string }
}) {
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
        const conversation = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))
        let res: Response
        let data: any
        let streamedAssistantHandled = false
        if (options?.leagueId) {
          const formData = new FormData()
          formData.append("message", trimmed)
          formData.append("messages", JSON.stringify(conversation))
          formData.append("leagueId", options.leagueId)
          if (options.sport) {
            formData.append("sport", options.sport)
          }
          if (options.conversationId) {
            formData.append("conversationId", options.conversationId)
          }
          if (options.privateMode) {
            formData.append("privateMode", "true")
          }
          if (options.targetUsername) {
            formData.append("targetUsername", options.targetUsername)
          }
          if (options.strategyMode) {
            formData.append("strategyMode", options.strategyMode)
          }
          if (options.source) {
            formData.append("source", options.source)
          }
          if (options?.contextScope?.sleeper_username) {
            formData.append("sleeperUsername", options.contextScope.sleeper_username)
          }
          res = await fetch("/api/chat/chimmy", {
            method: "POST",
            body: formData,
          })
          data = await res.json().catch(() => ({}))
        } else {
          res = await fetch("/api/ai/chat?stream=1", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              message: trimmed,
              conversation_history: conversation,
              sport: options?.sport,
              context_scope: options?.contextScope ?? { sleeper_username: "user", include_legacy: true },
              stream: true,
            }),
          })
          const contentType = res.headers.get("content-type") || ""
          if (res.ok && contentType.includes("text/event-stream") && res.body) {
            const decoder = new TextDecoder()
            const reader = res.body.getReader()
            let buffer = ""
            let responseText = ""

            const applyAssistantContent = (text: string) => {
              setMessages((prev) => {
                if (prev.length === 0) return [{ role: "assistant", content: text }]
                const last = prev[prev.length - 1]
                if (last?.role === "assistant") {
                  const next = [...prev]
                  next[next.length - 1] = { role: "assistant", content: text }
                  return next
                }
                return [...prev, { role: "assistant", content: text }]
              })
            }

            const processEvent = (rawBlock: string) => {
              const lines = rawBlock
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
              let event = "message"
              const dataLines: string[] = []
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  event = line.slice(6).trim()
                  continue
                }
                if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim())
                }
              }
              const payloadRaw = dataLines.join("\n")
              const payload = payloadRaw ? JSON.parse(payloadRaw) : {}

              if (event === "chunk") {
                const delta = typeof payload?.delta === "string" ? payload.delta : ""
                if (delta) {
                  responseText += delta
                  applyAssistantContent(responseText)
                  streamedAssistantHandled = true
                }
              } else if (event === "done") {
                if (!responseText && typeof payload?.response === "string") {
                  responseText = payload.response
                  applyAssistantContent(responseText)
                  streamedAssistantHandled = true
                }
                data = payload
              } else if (event === "error") {
                const err = typeof payload?.error === "string" ? payload.error : "AI stream failed"
                throw new Error(err)
              }
            }

            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const normalized = buffer.replace(/\r\n/g, "\n")
              let boundary = normalized.indexOf("\n\n")
              if (boundary === -1) {
                buffer = normalized
                continue
              }
              let working = normalized
              while (boundary !== -1) {
                const block = working.slice(0, boundary)
                working = working.slice(boundary + 2)
                if (block.trim().length > 0) {
                  processEvent(block)
                }
                boundary = working.indexOf("\n\n")
              }
              buffer = working
            }
            data = data ?? { response: responseText }
          } else {
            data = await res.json().catch(() => ({}))
          }
        }
        if (!res.ok) {
          const errMsg = data?.error || data?.message || "AI request failed"
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }])
          setError(errMsg)
          return
        }

        if (!streamedAssistantHandled) {
          const assistantContent =
            typeof data?.response === "string"
              ? data.response
              : typeof data?.answer === "string"
              ? data.answer
              : typeof data?.reply === "string"
              ? data.reply
              : data?.choices?.[0]?.message?.content ?? data?.message ?? "No response."
          setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }])
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Network error"
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }])
        setError(errMsg)
      } finally {
        setLoading(false)
      }
    },
    [
      loading,
      messages,
      options?.contextScope,
      options?.conversationId,
      options?.leagueId,
      options?.privateMode,
      options?.source,
      options?.sport,
      options?.strategyMode,
      options?.targetUsername,
    ]
  )

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, loading, error, send, clear }
}
