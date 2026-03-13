"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Hash,
  User2,
  Sparkles,
  X,
  MessageCircle,
  Gif as GifIcon,
  Image as ImageIcon,
  Film,
  SmilePlus,
  BarChart2,
  Pin,
  MoreHorizontal,
  Send,
  Loader2,
} from "lucide-react"
import type { PlatformChatMessage, PlatformChatThread } from "@/types/platform-shared"
import type { ChatTabId } from "@/types/chat"
import { useAIChat } from "@/hooks/useAIChat"
import { useMediaUpload } from "@/hooks/useMediaUpload"
import PinnedSection from "@/components/chat/PinnedSection"
import ChatStatsBotMessage, { placeholderStatsBotUpdate } from "@/components/chat/ChatStatsBotMessage"
import CommissionerBroadcastForm from "@/components/chat/CommissionerBroadcastForm"

type Props = {
  leagueId: string
  leagueName?: string
  isCommissioner?: boolean
  defaultOpen?: boolean
  onClose?: () => void
  className?: string
}

function parseMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) || []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

export default function LeagueChatPanel({
  leagueId,
  leagueName = "League",
  isCommissioner = false,
  defaultOpen = true,
  onClose,
  className = "",
}: Props) {
  const [activeTab, setActiveTab] = useState<ChatTabId>("league")
  const [threads, setThreads] = useState<PlatformChatThread[]>([])
  const [leagueThreadId, setLeagueThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<PlatformChatMessage[]>([])
  const [pinned, setPinned] = useState<PlatformChatMessage[]>([])
  const [dmThreadId, setDmThreadId] = useState<string | null>(null)
  const [dmMessages, setDmMessages] = useState<PlatformChatMessage[]>([])
  const [dmInput, setDmInput] = useState("")
  const [dmSending, setDmSending] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingDm, setLoadingDm] = useState(false)

  const aiChat = useAIChat({ leagueId })
  const mediaUpload = useMediaUpload(leagueThreadId ?? undefined)

  const resolvedLeagueThreadId = useMemo(() => {
    if (leagueThreadId) return leagueThreadId
    const fallback = `league:${leagueId}`
    const fromThreads = threads.find(
      (t) => (t.context as any)?.leagueId === leagueId || t.id === fallback
    )
    return fromThreads?.id ?? fallback
  }, [leagueId, leagueThreadId, threads])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingThreads(true)
      try {
        const res = await fetch("/api/shared/chat/threads", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        const list: PlatformChatThread[] = Array.isArray(json?.threads) ? json.threads : []
        if (!cancelled) {
          setThreads(list)
          const league = list.find(
            (t) => (t.context as any)?.leagueId === leagueId || t.id === `league:${leagueId}`
          )
          setLeagueThreadId(league?.id ?? null)
        }
      } finally {
        if (!cancelled) setLoadingThreads(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true)
    try {
      const [msgRes, pinRes] = await Promise.all([
        fetch(
          `/api/shared/chat/threads/${encodeURIComponent(threadId)}/messages?limit=80`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/shared/chat/threads/${encodeURIComponent(threadId)}/pinned`,
          { cache: "no-store" }
        ),
      ])
      const msgJson = await msgRes.json().catch(() => ({}))
      const pinJson = await pinRes.json().catch(() => ({}))
      const list: PlatformChatMessage[] = Array.isArray(msgJson?.messages) ? msgJson.messages : []
      const pinList: PlatformChatMessage[] = Array.isArray(pinJson?.pinned) ? pinJson.pinned : []
      setMessages(list)
      setPinned(pinList)
    } catch {
      setMessages([])
      setPinned([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "league" || !resolvedLeagueThreadId) return
    loadMessages(resolvedLeagueThreadId)
  }, [activeTab, resolvedLeagueThreadId, loadMessages])

  const handleSendLeague = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !resolvedLeagueThreadId) return

    setSending(true)
    setInput("")
    try {
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: text, messageType: "text" }),
        }
      )
      const json = await res.json().catch(() => ({}))
      const created: PlatformChatMessage | null = json?.message ?? null
      if (created) {
        setMessages((prev) => [...prev, created])
        const usernames = parseMentions(text)
        if (usernames.length > 0) {
          fetch("/api/shared/chat/mentions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              threadId: resolvedLeagueThreadId,
              messageId: created.id,
              mentionedUsernames: usernames,
            }),
          }).catch(() => {})
        }
      }
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
  }, [input, sending, resolvedLeagueThreadId])

  const handlePin = useCallback(
    async (messageId: string) => {
      if (!resolvedLeagueThreadId) return
      try {
        const res = await fetch(
          `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/pin`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messageId }),
          }
        )
        if (res.ok) void loadMessages(resolvedLeagueThreadId)
      } catch {
        // ignore
      }
    },
    [resolvedLeagueThreadId, loadMessages]
  )

  const dmThreads = useMemo(
    () => threads.filter((t) => t.threadType === "dm"),
    [threads]
  )

  useEffect(() => {
    if (activeTab !== "dm" || !dmThreadId) return
    setLoadingDm(true)
    fetch(
      `/api/shared/chat/threads/${encodeURIComponent(dmThreadId)}/messages?limit=50`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((json) => {
        setDmMessages(Array.isArray(json?.messages) ? json.messages : [])
      })
      .catch(() => setDmMessages([]))
      .finally(() => setLoadingDm(false))
  }, [activeTab, dmThreadId])

  const handleSendDm = useCallback(async () => {
    const text = dmInput.trim()
    if (!text || dmSending || !dmThreadId) return
    setDmSending(true)
    setDmInput("")
    try {
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(dmThreadId)}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: text, messageType: "text" }),
        }
      )
      const json = await res.json().catch(() => ({}))
      const created: PlatformChatMessage | null = json?.message ?? null
      if (created) setDmMessages((prev) => [...prev, created])
    } catch {
      setDmInput(text)
    } finally {
      setDmSending(false)
    }
  }, [dmInput, dmSending, dmThreadId])

  const statsBotPlaceholder = useMemo(
    () => placeholderStatsBotUpdate(leagueId),
    [leagueId]
  )

  const tabs: { id: ChatTabId; label: string; icon: React.ReactNode }[] = [
    { id: "league", label: "League Chat", icon: <Hash className="h-3.5 w-3.5" /> },
    { id: "dm", label: "Private DMs", icon: <User2 className="h-3.5 w-3.5" /> },
    { id: "ai", label: "AI Chat", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ]

  return (
    <section
      className={`flex flex-col rounded-2xl border shadow-xl ${className}`}
      style={{
        borderColor: "var(--border)",
        background: "var(--panel)",
      }}
      aria-label="League chat"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "var(--accent-cyan-strong)" }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {leagueName}
            </p>
            <p className="text-[10px]" style={{ color: "var(--muted2)" }}>
              League Chat · DMs · AI
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border p-1.5"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel2)",
              color: "var(--muted)",
            }}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="flex border-b px-2 py-1" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors"
            style={{
              background: activeTab === tab.id ? "color-mix(in srgb, var(--accent-cyan-strong) 12%, transparent)" : "transparent",
              color: activeTab === tab.id ? "var(--accent-cyan-strong)" : "var(--muted2)",
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "league" && (
        <>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 py-2">
            <PinnedSection pinned={pinned} className="mb-2" />

            <div className="mb-2">
              <ChatStatsBotMessage update={statsBotPlaceholder} compact />
            </div>

            {isCommissioner && resolvedLeagueThreadId && (
              <div className="mb-2">
                <CommissionerBroadcastForm
                  threadId={resolvedLeagueThreadId}
                  leagueId={leagueId}
                  onSent={() => loadMessages(resolvedLeagueThreadId)}
                />
              </div>
            )}

            <div className="flex-1 min-h-[200px] overflow-y-auto rounded-xl border px-2 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
              {loadingMessages || loadingThreads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--muted)" }} />
                </div>
              ) : (
                <ul className="space-y-2">
                  {messages.map((m) => (
                    <LeagueMessageRow
                      key={m.id}
                      msg={m}
                      threadId={resolvedLeagueThreadId}
                      onPin={() => handlePin(m.id)}
                      onReaction={async (emoji) => {
                        try {
                          await fetch(
                            `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/messages/${encodeURIComponent(m.id)}/reactions`,
                            { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emoji }) }
                          )
                          if (resolvedLeagueThreadId) loadMessages(resolvedLeagueThreadId)
                        } catch {
                          // ignore
                        }
                      }}
                      showPin
                    />
                  ))}
                  {messages.length === 0 && !loadingMessages && (
                    <li className="py-4 text-center text-[11px]" style={{ color: "var(--muted)" }}>
                      No messages yet. Say something or @mention a manager.
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-1.5">
              <MediaPlaceholderButtons upload={mediaUpload} />
              <div className="flex-1 min-w-[120px] rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendLeague()}
                  placeholder="Message… @username to mention"
                  className="w-full bg-transparent text-xs outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendLeague}
                disabled={!input.trim() || sending}
                className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  background: "var(--accent-cyan-strong)",
                  color: "var(--on-accent-bg)",
                }}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "dm" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="grid flex-1 min-h-[200px] gap-2 px-3 py-2 sm:grid-cols-[140px_minmax(0,1fr)]">
            <ul className="overflow-y-auto rounded-xl border py-1" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
              {dmThreads.length === 0 ? (
                <li className="px-2 py-2 text-[11px]" style={{ color: "var(--muted)" }}>No DMs yet</li>
              ) : (
                dmThreads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setDmThreadId(t.id)}
                      className="w-full truncate px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-black/5"
                      style={{
                        background: dmThreadId === t.id ? "color-mix(in srgb, var(--accent-cyan-strong) 10%, transparent)" : "transparent",
                        color: dmThreadId === t.id ? "var(--accent-cyan-strong)" : "var(--text)",
                      }}
                    >
                      {t.title || "DM"}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex flex-col min-h-0 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
              {dmThreadId ? (
                <>
                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                    {loadingDm ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} /></div>
                    ) : (
                      dmMessages.map((m) => (
                        <LeagueMessageRow
                          key={m.id}
                          msg={m}
                          threadId={dmThreadId ?? undefined}
                          onPin={() => {}}
                          onReaction={dmThreadId ? async (emoji) => {
                            try {
                              await fetch(
                                `/api/shared/chat/threads/${encodeURIComponent(dmThreadId)}/messages/${encodeURIComponent(m.id)}/reactions`,
                                { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emoji }) }
                              )
                              setLoadingDm(true)
                              const res = await fetch(`/api/shared/chat/threads/${encodeURIComponent(dmThreadId)}/messages?limit=50`, { cache: "no-store" })
                              const json = await res.json().catch(() => ({}))
                              setDmMessages(Array.isArray(json?.messages) ? json.messages : [])
                            } catch {
                              // ignore
                            } finally {
                              setLoadingDm(false)
                            }
                          } : undefined}
                          showPin={false}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 p-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <input
                      type="text"
                      value={dmInput}
                      onChange={(e) => setDmInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendDm()}
                      placeholder="Message…"
                      className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                    />
                    <button
                      type="button"
                      onClick={handleSendDm}
                      disabled={!dmInput.trim() || dmSending}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                      style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
                    >
                      {dmSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-center text-[11px]" style={{ color: "var(--muted)" }}>
                  Select a conversation or start a DM from a manager profile.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <AIChatTabContent aiChat={aiChat} />
      )}
    </section>
  )
}

function MediaPlaceholderButtons({ upload }: { upload: ReturnType<typeof useMediaUpload> }) {
  return (
    <>
      <button
        type="button"
        onClick={() => upload.uploadGif()}
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
        title="GIF"
        aria-label="Add GIF"
      >
        <GifIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => upload.uploadImage()}
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
        title="Image"
        aria-label="Upload image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => upload.uploadVideo()}
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
        title="Video"
        aria-label="Upload video"
      >
        <Film className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => upload.uploadMeme()}
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
        title="Meme"
        aria-label="Add meme"
      >
        <SmilePlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
        title="Poll"
        aria-label="Create poll"
      >
        <BarChart2 className="h-4 w-4" />
      </button>
    </>
  )
}

function AIChatTabContent({
  aiChat,
}: {
  aiChat: ReturnType<typeof useAIChat>
}) {
  const [aiInput, setAiInput] = useState("")
  const send = () => {
    if (!aiInput.trim() || aiChat.loading) return
    aiChat.send(aiInput)
    setAiInput("")
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 py-2">
      <div className="flex-1 overflow-y-auto space-y-2 rounded-xl border px-2 py-2 mb-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        {aiChat.messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] ${m.role === "user" ? "ml-4" : "mr-4"}`}
            style={{
              background: m.role === "user" ? "color-mix(in srgb, var(--accent-cyan-strong) 15%, transparent)" : "var(--panel)",
              color: "var(--text)",
            }}
          >
            {m.content}
          </div>
        ))}
        {aiChat.loading && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            AI is thinking…
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask AI about trades, waivers, lineups…"
          className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
          style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!aiInput.trim() || aiChat.loading}
          className="rounded-xl px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
          style={{
            background: "var(--accent-cyan-strong)",
            color: "var(--on-accent-bg)",
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

const QUICK_EMOJIS = ["👍", "😂", "🔥", "❤️", "👀"]

function LeagueMessageRow({
  msg,
  threadId,
  onPin,
  onReaction,
  showPin,
}: {
  msg: PlatformChatMessage
  threadId?: string
  onPin: () => void
  onReaction?: (emoji: string) => void
  showPin: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const reactions = (msg.metadata as any)?.reactions as { emoji: string; count: number; userIds?: string[] }[] | undefined
  const lastSeen = (msg.metadata as any)?.lastSeenAt as string | undefined

  return (
    <li className="group rounded-xl px-2 py-1.5 hover:bg-black/5 relative">
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {msg.senderName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
              {msg.senderName}
            </span>
            <span className="text-[10px]" style={{ color: "var(--muted2)" }}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            {lastSeen && (
              <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                Last seen {new Date(lastSeen).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {msg.body}
          </p>
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            {reactions?.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReaction?.(r.emoji)}
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
              >
                {r.emoji} {r.count}
              </button>
            ))}
            {threadId && onReaction && (
              <>
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  className="inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px]"
                  style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                  aria-label="Add reaction"
                >
                  +
                </button>
                {pickerOpen && (
                  <div
                    className="absolute left-0 top-full z-10 mt-0.5 flex gap-1 rounded-lg border p-1 shadow-lg"
                    style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onReaction(emoji)
                          setPickerOpen(false)
                        }}
                        className="rounded p-1 text-sm hover:bg-black/10"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showPin && (
              <button
                type="button"
                onClick={onPin}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium"
                style={{ color: "var(--muted2)" }}
              >
                <Pin className="h-3 w-3" />
                Pin
              </button>
            )}
            <button
              type="button"
              className="rounded p-0.5"
              style={{ color: "var(--muted2)" }}
              aria-label="More"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
