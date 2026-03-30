"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  Hash,
  User2,
  Sparkles,
  X,
  MessageCircle,
  Image as ImageIcon,
  Smile,
  FileImage,
  Paperclip,
  Search,
  BarChart2,
  Pin,
  MoreHorizontal,
  Send,
  Loader2,
  ChevronDown,
  Megaphone,
} from "lucide-react"
import type { PlatformChatMessage, PlatformChatThread } from "@/types/platform-shared"
import type { ChatTabId } from "@/types/chat"
import PinnedSection from "@/components/chat/PinnedSection"
import ChatStatsBotMessage, { placeholderStatsBotUpdate } from "@/components/chat/ChatStatsBotMessage"
import CommissionerBroadcastForm from "@/components/chat/CommissionerBroadcastForm"
import { ChimmyChatShell } from "@/components/chimmy"
import { useUserTimezone } from "@/hooks/useUserTimezone"
import {
  parseMentions,
  getLeagueChatSendPayload,
  LEAGUE_CHAT_MENTIONS_ENDPOINT,
  getMentionsPayload,
  isLeagueVirtualChat,
  handleComposerKeyDown,
  createLeaguePollPayload,
  isLeagueSystemNotice,
  getLeagueSystemNoticeLabel,
  getBroadcastBody,
  getStatsBotPayload,
  validateMessageBody,
  getLeagueMentionRanges,
  parseLeaguePollPayload,
  getLeaguePollVoteUrl,
  getLeaguePollCloseUrl,
  getSystemNoticeBody,
} from "@/lib/league-chat"
import { getPollIntervalMs, getPresenceStatus } from "@/lib/chat-core"
import {
  EMOJI_LIST,
  appendEmoji,
  isGifSearchConfigured,
  getGifProviderName,
  searchGifs,
  isValidGifOrImageUrl,
  validateImageFile,
  validateAttachmentFile,
  getMessagePayloadForImage,
  getMessagePayloadForGif,
  getMessagePayloadForFile,
  canSendComposerMessage,
  getAttachmentPreviewLabel,
  clearAttachmentState,
  resolveMediaViewerUrl,
  RichMessageRenderer,
} from "@/lib/rich-message"
import type { AttachmentPreview, GifSearchResult } from "@/lib/rich-message"
import { readAIContextFromSearchParams } from "@/lib/chimmy-chat"
import type { AIChatContext } from "@/lib/chimmy-chat"
import { buildChimmyToolDisplayContext } from "@/lib/chimmy-interface"
import { useAIAssistantAvailability } from "@/hooks/useAIAssistantAvailability"

type Props = {
  leagueId: string
  leagueName?: string
  isCommissioner?: boolean
  defaultOpen?: boolean
  onClose?: () => void
  className?: string
}

function buildDmAISeedPrompt(messages: PlatformChatMessage[]): string {
  const lines = messages
    .slice(-10)
    .map((msg) => `${msg.senderName}: ${msg.body}`)
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return "Help me with trade, waiver, and draft strategy based on this direct conversation."
  }
  return [
    "Use this direct conversation as context and help with the best next fantasy move.",
    "",
    "Recent messages:",
    ...lines,
    "",
    "Give one clear recommendation and a backup option.",
  ].join("\n")
}

export default function LeagueChatPanel({
  leagueId,
  leagueName = "League",
  isCommissioner = false,
  defaultOpen = true,
  onClose,
  className = "",
}: Props) {
  const { data: session } = useSession()
  const { enabled: aiAssistantEnabled, loading: aiAvailabilityLoading } = useAIAssistantAvailability()
  const currentUserId = (session?.user as { id?: string })?.id ?? null
  const searchParams = useSearchParams()
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
  const [showPollComposer, setShowPollComposer] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [gifUrlOpen, setGifUrlOpen] = useState(false)
  const [gifUrlInput, setGifUrlInput] = useState("")
  const [gifSearchQuery, setGifSearchQuery] = useState("")
  const [gifSearchLoading, setGifSearchLoading] = useState(false)
  const [gifSearchResults, setGifSearchResults] = useState<GifSearchResult[]>([])
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null)
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null)
  const [aiDmContext, setAiDmContext] = useState<AIChatContext | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatSource = useMemo(() => {
    const value = searchParams?.get("source")?.trim()
    return value || null
  }, [searchParams])
  const isTribeChat = chatSource?.startsWith("tribe_") ?? false

  const resolvedLeagueThreadId = useMemo(() => {
    if (leagueThreadId) return leagueThreadId
    const fallback = `league:${leagueId}`
    const fromThreads = threads.find(
      (t) => (t.context as any)?.leagueId === leagueId || t.id === fallback
    )
    return fromThreads?.id ?? fallback
  }, [leagueId, leagueThreadId, threads])

  const resolvedSport = useMemo(() => {
    const leagueThread = threads.find((t) => t.id === resolvedLeagueThreadId)
    const sport = (leagueThread?.context as { sport?: unknown } | undefined)?.sport
    return typeof sport === "string" && sport.trim().length > 0 ? sport : undefined
  }, [resolvedLeagueThreadId, threads])

  const aiContextFromUrl = useMemo(() => readAIContextFromSearchParams(searchParams), [searchParams])
  const aiContext = useMemo<AIChatContext>(
    () => ({
      ...aiContextFromUrl,
      ...aiDmContext,
      source: aiDmContext?.source ?? aiContextFromUrl.source,
    }),
    [aiContextFromUrl, aiDmContext]
  )
  const chimmyToolContext = useMemo(
    () =>
      buildChimmyToolDisplayContext({
        source: aiContext.source ?? null,
        leagueName: aiContext.leagueName ?? leagueName,
        sport: aiContext.sport ?? resolvedSport ?? null,
      }),
    [aiContext.leagueName, aiContext.source, aiContext.sport, leagueName, resolvedSport]
  )

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

  const loadMessages = useCallback(async (threadId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingMessages(true)
    try {
      const messageParams = new URLSearchParams({ limit: "80" })
      if (chatSource) messageParams.set("source", chatSource)
      const [msgRes, pinRes] = await Promise.all([
        fetch(
          `/api/shared/chat/threads/${encodeURIComponent(threadId)}/messages?${messageParams.toString()}`,
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
      if (!options?.silent) setLoadingMessages(false)
    }
  }, [chatSource])

  useEffect(() => {
    if (activeTab !== "league" || !resolvedLeagueThreadId) return
    loadMessages(resolvedLeagueThreadId)
  }, [activeTab, resolvedLeagueThreadId, loadMessages])

  useEffect(() => {
    if (!focusedMessageId) return
    const target = document.getElementById(`league-message-${focusedMessageId}`)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    const timer = window.setTimeout(() => setFocusedMessageId(null), 2500)
    return () => window.clearTimeout(timer)
  }, [focusedMessageId, messages, dmMessages, activeTab])

  useEffect(() => {
    if (activeTab !== "league") {
      clearAttachmentState(setAttachmentPreview, setUploadError)
      setGifUrlOpen(false)
      setGifUrlInput("")
      setGifSearchResults([])
      setGifSearchQuery("")
      setEmojiPickerOpen(false)
    }
  }, [activeTab])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput((prev) => appendEmoji(prev, emoji))
    setEmojiPickerOpen(false)
  }, [])

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.error ?? "Invalid image")
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/shared/chat/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data?.url !== "string") {
        setUploadError(typeof data?.error === "string" ? data.error : "Upload failed")
        return
      }
      setAttachmentPreview({ type: "image", file, url: data.url })
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const validation = validateAttachmentFile(file)
    if (!validation.valid) {
      setUploadError(validation.error ?? "Invalid file")
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/shared/chat/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data?.url !== "string") {
        setUploadError(typeof data?.error === "string" ? data.error : "Upload failed")
        return
      }
      setAttachmentPreview({ type: "file", file, url: data.url })
    } finally {
      setUploading(false)
    }
  }, [])

  const handleGifUrlSubmit = useCallback(() => {
    const url = gifUrlInput.trim()
    if (!isValidGifOrImageUrl(url)) {
      setUploadError("Enter a valid GIF URL")
      return
    }
    setAttachmentPreview({ type: "gif", url, source: "url" })
    setUploadError(null)
    setGifUrlInput("")
    setGifUrlOpen(false)
  }, [gifUrlInput])

  const handleGifSearch = useCallback(async () => {
    const query = gifSearchQuery.trim()
    if (!query || !isGifSearchConfigured()) return
    setGifSearchLoading(true)
    try {
      const results = await searchGifs(query, 16)
      setGifSearchResults(results)
    } finally {
      setGifSearchLoading(false)
    }
  }, [gifSearchQuery])

  const handleSendLeague = useCallback(async () => {
    const text = input.trim()
    if (sending || !resolvedLeagueThreadId) return
    const hasAttachment = attachmentPreview !== null
    if (!hasAttachment) {
      const validation = validateMessageBody(text)
      if (!validation.valid) {
        if (validation.error) toast.error(validation.error)
        return
      }
    } else if (!text) {
      // Attachment-only send is valid.
    }

    setSending(true)
    setUploadError(null)
    if (!hasAttachment) setInput("")
    try {
      const payload = hasAttachment
        ? attachmentPreview?.type === "image"
          ? getMessagePayloadForImage(attachmentPreview.url)
          : attachmentPreview?.type === "gif"
            ? getMessagePayloadForGif(attachmentPreview.url, attachmentPreview.source)
            : getMessagePayloadForFile(
                attachmentPreview?.url || "",
                attachmentPreview?.file?.name || "attachment",
                attachmentPreview?.file?.type || undefined,
              )
        : getLeagueChatSendPayload(text)
      if (chatSource) {
        ;(payload as Record<string, unknown>).source = chatSource
      }
      if (hasAttachment && attachmentPreview?.type === "image") {
        ;(payload as Record<string, unknown>).imageUrl = attachmentPreview.url
      }
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errorMessage = typeof json?.error === "string" ? json.error : "Unable to send message."
        if (!hasAttachment) setInput(text)
        setUploadError(errorMessage)
        toast.error(errorMessage)
        return
      }
      const created: PlatformChatMessage | null = json?.message ?? null
      if (created) {
        setMessages((prev) => [...prev, created])
        if (hasAttachment) {
          clearAttachmentState(setAttachmentPreview, setUploadError)
        }
        const usernames = parseMentions(text)
        if (!hasAttachment && usernames.length > 0) {
          fetch(LEAGUE_CHAT_MENTIONS_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(getMentionsPayload(resolvedLeagueThreadId, created.id, usernames)),
          }).catch(() => {})
        }
      }
      if (json?.commandResult?.ok && typeof json.commandResult.message === "string") {
        toast.success(json.commandResult.message)
      }
    } catch {
      if (!hasAttachment) setInput(text)
      toast.error("Unable to send message.")
    } finally {
      setSending(false)
    }
  }, [attachmentPreview, chatSource, input, sending, resolvedLeagueThreadId])

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

  const handleUnpin = useCallback(
    async (pinMessageId: string) => {
      if (!resolvedLeagueThreadId) return
      try {
        const res = await fetch(
          `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/unpin`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pinMessageId }),
          }
        )
        if (res.ok) void loadMessages(resolvedLeagueThreadId)
      } catch {
        // ignore
      }
    },
    [resolvedLeagueThreadId, loadMessages]
  )

  const handleStartDmFromMessage = useCallback(async (username: string) => {
    const clean = username.trim()
    if (!clean) return
    try {
      const res = await fetch("/api/shared/chat/dm/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: clean }),
      })
      const json = await res.json().catch(() => ({}))
      const thread = json?.thread as PlatformChatThread | undefined
      if (!res.ok || !thread?.id) {
        const msg = typeof json?.error === "string" ? json.error : "Unable to start conversation"
        toast.error(msg)
        return
      }
      setThreads((prev) => {
        if (prev.some((t) => t.id === thread.id)) return prev
        return [thread, ...prev]
      })
      setActiveTab("dm")
      setDmThreadId(thread.id)
    } catch {
      toast.error("Unable to start conversation")
    }
  }, [])

  const dmThreads = useMemo(
    () => threads.filter((t) => t.threadType === "dm" || t.threadType === "group"),
    [threads]
  )
  const selectedDmThread = useMemo(
    () => dmThreads.find((thread) => thread.id === dmThreadId) ?? null,
    [dmThreadId, dmThreads]
  )
  const selectedDmContext = (selectedDmThread?.context || {}) as Record<string, unknown>
  const selectedDmTargetUsername =
    typeof selectedDmContext.otherUsername === "string" && selectedDmContext.otherUsername.trim().length > 0
      ? selectedDmContext.otherUsername.trim()
      : null

  const loadDmMessages = useCallback(async (threadId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingDm(true)
    try {
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(threadId)}/messages?limit=50`,
        { cache: "no-store" }
      )
      const json = await res.json().catch(() => ({}))
      setDmMessages(Array.isArray(json?.messages) ? json.messages : [])
    } catch {
      setDmMessages([])
    } finally {
      if (!options?.silent) setLoadingDm(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "dm" || !dmThreadId) return
    void loadDmMessages(dmThreadId)
  }, [activeTab, dmThreadId, loadDmMessages])

  useEffect(() => {
    if (activeTab !== "dm" || dmThreadId || dmThreads.length === 0) return
    setDmThreadId(dmThreads[0]?.id ?? null)
  }, [activeTab, dmThreadId, dmThreads])

  useEffect(() => {
    const shouldRefreshLeague = activeTab === "league" && Boolean(resolvedLeagueThreadId)
    const shouldRefreshDm = activeTab === "dm" && Boolean(dmThreadId)
    if (!shouldRefreshLeague && !shouldRefreshDm) return
    if (typeof document === "undefined") return

    let cancelled = false
    const refresh = async (silent: boolean) => {
      if (cancelled || document.visibilityState !== "visible") return
      if (shouldRefreshLeague && resolvedLeagueThreadId) {
        await loadMessages(resolvedLeagueThreadId, { silent })
      } else if (shouldRefreshDm && dmThreadId) {
        await loadDmMessages(dmThreadId, { silent })
      }
    }

    const intervalMs = getPollIntervalMs({ active: true })
    const timer = window.setInterval(() => {
      void refresh(true)
    }, intervalMs)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh(true)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [activeTab, dmThreadId, loadDmMessages, loadMessages, resolvedLeagueThreadId])

  const handleSendDm = useCallback(async () => {
    const text = dmInput.trim()
    if (dmSending || !dmThreadId) return
    const validation = validateMessageBody(text)
    if (!validation.valid) return
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

  const handleOpenDmAi = useCallback(() => {
    if (!dmThreadId) return
    const nextAiContext: AIChatContext = {
      source: "messages_dm_ai",
      conversationId: dmThreadId,
      privateMode: selectedDmThread?.threadType === "dm",
      targetUsername: selectedDmTargetUsername ?? undefined,
      prompt: buildDmAISeedPrompt(dmMessages),
      strategyMode: "dm_chat_review",
      leagueId:
        typeof selectedDmContext.leagueId === "string" && selectedDmContext.leagueId.trim().length > 0
          ? selectedDmContext.leagueId.trim()
          : undefined,
      sport:
        typeof selectedDmContext.sport === "string" && selectedDmContext.sport.trim().length > 0
          ? (selectedDmContext.sport.trim() as AIChatContext["sport"])
          : undefined,
    }
    setAiDmContext(nextAiContext)
    setActiveTab("ai")
  }, [dmMessages, dmThreadId, selectedDmContext, selectedDmTargetUsername, selectedDmThread?.threadType])

  const statsBotPlaceholder = useMemo(
    () => placeholderStatsBotUpdate(leagueId),
    [leagueId]
  )

  const tabs: { id: ChatTabId; label: string; icon: React.ReactNode }[] = [
    { id: "league", label: "League Chat", icon: <Hash className="h-3.5 w-3.5" /> },
    { id: "dm", label: "Messages", icon: <User2 className="h-3.5 w-3.5" /> },
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
              League Chat · Messages · AI
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
            {!isTribeChat && (
              <PinnedSection
                pinned={pinned}
                onUnpin={handleUnpin}
                onSelectPinned={(_pinMessage, referencedMessageId) => setFocusedMessageId(referencedMessageId)}
                canUnpin={isCommissioner && !isLeagueVirtualChat(resolvedLeagueThreadId)}
                className="mb-2"
              />
            )}

            {!isTribeChat && (
              <div className="mb-2">
                <ChatStatsBotMessage update={statsBotPlaceholder} compact />
              </div>
            )}

            {isCommissioner && resolvedLeagueThreadId && !isTribeChat && (
              <div className="mb-2">
                <CommissionerBroadcastForm
                  threadId={resolvedLeagueThreadId}
                  leagueId={leagueId}
                  onSent={() => loadMessages(resolvedLeagueThreadId)}
                />
              </div>
            )}

            <div
              className="flex-1 min-h-[200px] overflow-y-auto rounded-xl border px-2 py-2 relative"
              style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
            >
              {loadingMessages || loadingThreads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--muted)" }} />
                </div>
              ) : (
                <>
                  <ul className="space-y-2">
                    {messages.map((m, index) => (
                      <LeagueMessageRow
                        key={m.id}
                        msg={m}
                        threadId={resolvedLeagueThreadId}
                        previousMsg={index > 0 ? messages[index - 1] : null}
                        onPin={() => handlePin(m.id)}
                        onReaction={async (emoji, remove) => {
                          try {
                            await fetch(
                              `/api/shared/chat/threads/${encodeURIComponent(resolvedLeagueThreadId)}/messages/${encodeURIComponent(m.id)}/reactions`,
                              {
                                method: remove ? "DELETE" : "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ emoji }),
                              }
                            )
                            if (resolvedLeagueThreadId) loadMessages(resolvedLeagueThreadId)
                          } catch {
                            // ignore
                          }
                        }}
                        onStartDm={handleStartDmFromMessage}
                        onPollVote={async (optionIndex) => {
                          try {
                            if (isLeagueVirtualChat(resolvedLeagueThreadId)) return
                            await fetch(
                              getLeaguePollVoteUrl(resolvedLeagueThreadId, m.id),
                              {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ optionIndex }),
                              }
                            )
                            void loadMessages(resolvedLeagueThreadId, { silent: true })
                          } catch {
                            // ignore
                          }
                        }}
                        onPollClose={async () => {
                          try {
                            if (isLeagueVirtualChat(resolvedLeagueThreadId)) return
                            await fetch(getLeaguePollCloseUrl(resolvedLeagueThreadId, m.id), { method: "POST" })
                            void loadMessages(resolvedLeagueThreadId, { silent: true })
                          } catch {
                            // ignore
                          }
                        }}
                        canClosePoll={isCommissioner && !isLeagueVirtualChat(resolvedLeagueThreadId)}
                        pollVotingEnabled={!isLeagueVirtualChat(resolvedLeagueThreadId)}
                        showPin={!isLeagueVirtualChat(resolvedLeagueThreadId)}
                        currentUserId={currentUserId}
                        highlighted={focusedMessageId === m.id}
                        onMediaOpen={(url) => setMediaViewerUrl(resolveMediaViewerUrl(url))}
                      />
                    ))}
                    {messages.length === 0 && !loadingMessages && (
                      <li className="py-4 text-center text-[11px]" style={{ color: "var(--muted)" }}>
                        {isTribeChat ? "No messages in this tribe chat yet." : "No messages yet. Say something or @mention a manager."}
                      </li>
                    )}
                  </ul>
                  <div ref={messagesEndRef} />
                  {messages.length > 3 && (
                    <button
                      type="button"
                      onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                      className="absolute bottom-2 right-2 rounded-full border p-1.5 shadow"
                      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
                      aria-label="Scroll to bottom"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {showPollComposer && resolvedLeagueThreadId && (
              <div className="mb-2 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                <LeaguePollComposer
                  threadId={resolvedLeagueThreadId}
                  isVirtualThread={isLeagueVirtualChat(resolvedLeagueThreadId)}
                  onSent={() => { setShowPollComposer(false); loadMessages(resolvedLeagueThreadId) }}
                  onCancel={() => setShowPollComposer(false)}
                />
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-[11px]" style={{ color: "var(--error)" }}>
                {uploadError}
              </p>
            )}
            {attachmentPreview && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border px-2 py-1.5" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                {(attachmentPreview.type === "image" || attachmentPreview.type === "gif") && (
                  <img src={attachmentPreview.url} alt="Preview" className="h-10 w-10 rounded object-cover" />
                )}
                {attachmentPreview.type === "file" && <Paperclip className="h-4 w-4" style={{ color: "var(--muted)" }} />}
                <span className="text-[11px] truncate flex-1" style={{ color: "var(--muted2)" }}>
                  {getAttachmentPreviewLabel(attachmentPreview)}
                </span>
                <button
                  type="button"
                  onClick={() => clearAttachmentState(setAttachmentPreview, setUploadError)}
                  className="rounded p-1"
                  style={{ color: "var(--muted)" }}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-2 relative flex flex-wrap items-end gap-1.5">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="rounded-lg border p-2"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                title="Emoji"
                aria-label="Emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border p-2 disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                title="Upload image"
                aria-label="Upload image"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => setGifUrlOpen((v) => !v)}
                className="rounded-lg border p-2"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                title="GIF"
                aria-label="GIF"
              >
                <FileImage className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border p-2"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                title="Attach file"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => setShowPollComposer((v) => !v)}
                className="rounded-lg border p-2"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
                title="Create poll"
                aria-label="Create poll"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-[120px] rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleComposerKeyDown(e, handleSendLeague, canSendComposerMessage(input, attachmentPreview, sending))
                  }
                  placeholder="Message… @username to mention"
                  className="w-full bg-transparent text-xs outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendLeague}
                disabled={!canSendComposerMessage(input, attachmentPreview, sending)}
                className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  background: "var(--accent-cyan-strong)",
                  color: "var(--on-accent-bg)",
                }}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
              {emojiPickerOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 rounded-xl border p-2 shadow-lg z-10"
                  style={{ background: "var(--panel)", borderColor: "var(--border)", maxHeight: "160px", overflowY: "auto" }}
                >
                  <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-lg leading-8 w-8 rounded hover:opacity-80"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {gifUrlOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 rounded-xl border p-3 shadow-lg z-10 w-80"
                  style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                >
                  {isGifSearchConfigured() ? (
                    <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Search GIFs or paste a GIF URL.</p>
                  ) : (
                    <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Paste a GIF or image URL.</p>
                  )}
                  {isGifSearchConfigured() && (
                    <div className="mb-2">
                      <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-2 h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
                          <input
                            type="text"
                            value={gifSearchQuery}
                            onChange={(e) => setGifSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                void handleGifSearch()
                              }
                            }}
                            placeholder={`Search ${getGifProviderName() || "GIF"}...`}
                            className="w-full rounded-lg border pl-7 pr-2 py-1.5 text-xs"
                            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleGifSearch()}
                          disabled={!gifSearchQuery.trim() || gifSearchLoading}
                          className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          {gifSearchLoading ? "…" : "Search"}
                        </button>
                      </div>
                      {gifSearchResults.length > 0 && (
                        <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border p-1.5 mb-2" style={{ borderColor: "var(--border)" }}>
                          {gifSearchResults.map((gif) => (
                            <button
                              key={gif.id}
                              type="button"
                              onClick={() => {
                                setAttachmentPreview({ type: "gif", url: gif.url, source: gif.provider })
                                setGifUrlOpen(false)
                                setUploadError(null)
                              }}
                              className="overflow-hidden rounded border"
                              style={{ borderColor: "var(--border)" }}
                            >
                              <img src={gif.previewUrl || gif.url} alt="GIF result" className="h-14 w-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="url"
                    value={gifUrlInput}
                    onChange={(e) => setGifUrlInput(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border px-2 py-1.5 text-xs mb-2"
                    style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGifUrlOpen(false)
                        setGifUrlInput("")
                        setGifSearchQuery("")
                        setGifSearchResults([])
                      }}
                      className="rounded-lg border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGifUrlSubmit}
                      className="rounded-lg px-2 py-1 text-xs font-medium"
                      style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
                    >
                      Add GIF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "dm" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="grid flex-1 min-h-[200px] gap-2 px-3 py-2 sm:grid-cols-[140px_minmax(0,1fr)]">
            <ul className="overflow-y-auto rounded-xl border py-1" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
              {dmThreads.length === 0 ? (
                <li className="px-2 py-2 text-[11px]" style={{ color: "var(--muted)" }}>No messages yet</li>
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
                      {t.title || (t.threadType === "group" ? "Group chat" : "Direct message")}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex flex-col min-h-0 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
              {dmThreadId ? (
                <>
                  <div className="flex items-center justify-end border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
                    <button
                      type="button"
                      onClick={handleOpenDmAi}
                      data-testid="league-chat-dm-ai-chat-button"
                      className="rounded-md border px-2 py-1 text-[10px]"
                      style={{ borderColor: "var(--border)", color: "var(--accent-cyan-strong)" }}
                    >
                      {aiAssistantEnabled ? "Ask AI about this chat" : "Open AI fallback guidance"}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                    {loadingDm ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} /></div>
                    ) : (
                      dmMessages.map((m, index) => (
                        <LeagueMessageRow
                          key={m.id}
                          msg={m}
                          threadId={dmThreadId ?? undefined}
                          previousMsg={index > 0 ? dmMessages[index - 1] : null}
                          onPin={() => {}}
                          onReaction={dmThreadId ? async (emoji, remove) => {
                            try {
                              await fetch(
                                `/api/shared/chat/threads/${encodeURIComponent(dmThreadId)}/messages/${encodeURIComponent(m.id)}/reactions`,
                                {
                                  method: remove ? "DELETE" : "POST",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ emoji }),
                                }
                              )
                              await loadDmMessages(dmThreadId)
                            } catch {
                              // ignore
                            }
                          } : undefined}
                          onStartDm={handleStartDmFromMessage}
                          onPollVote={dmThreadId ? async (optionIndex) => {
                            try {
                              await fetch(getLeaguePollVoteUrl(dmThreadId, m.id), {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ optionIndex }),
                              })
                              await loadDmMessages(dmThreadId, { silent: true })
                            } catch {
                              // ignore
                            }
                          } : undefined}
                          onPollClose={dmThreadId ? async () => {
                            try {
                              await fetch(getLeaguePollCloseUrl(dmThreadId, m.id), { method: "POST" })
                              await loadDmMessages(dmThreadId, { silent: true })
                            } catch {
                              // ignore
                            }
                          } : undefined}
                          canClosePoll
                          pollVotingEnabled
                          showPin={false}
                          currentUserId={currentUserId}
                          highlighted={focusedMessageId === m.id}
                          onMediaOpen={(url) => setMediaViewerUrl(resolveMediaViewerUrl(url))}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 p-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <input
                      type="text"
                      value={dmInput}
                      onChange={(e) => setDmInput(e.target.value)}
                      onKeyDown={(e) =>
                        handleComposerKeyDown(e, handleSendDm, Boolean(dmInput.trim()) && !dmSending)
                      }
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
                  Select a conversation or start a new DM from a manager profile.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="flex-1 min-h-0 p-2">
          {aiAssistantEnabled || aiAvailabilityLoading ? (
            <ChimmyChatShell
              initialPrompt={aiContext.prompt ?? ""}
              clearUrlPromptAfterUse
              leagueName={leagueName}
              leagueId={aiContext.leagueId ?? leagueId}
              insightType={aiContext.insightType}
              teamId={aiContext.teamId ?? null}
              sport={aiContext.sport ?? resolvedSport ?? null}
              season={aiContext.season ?? null}
              week={aiContext.week ?? null}
              conversationId={aiContext.conversationId ?? null}
              privateMode={Boolean(aiContext.privateMode)}
              targetUsername={aiContext.targetUsername ?? null}
              strategyMode={aiContext.strategyMode ?? null}
              source={aiContext.source}
              toolContext={chimmyToolContext}
              compact
              className="min-h-[360px] h-full"
            />
          ) : (
            <div
              data-testid="league-chat-ai-fallback"
              className="min-h-[360px] rounded-xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                AI chat is temporarily unavailable
              </h3>
              <p className="mt-2 text-xs" style={{ color: "var(--muted2)" }}>
                League chat and direct messages still work. Use deterministic tools while AI is offline.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/waiver-ai?leagueId=${encodeURIComponent(leagueId)}`}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Open waiver planner
                </Link>
                <Link
                  href={`/trade-finder?leagueId=${encodeURIComponent(leagueId)}`}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Open trade finder
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      {mediaViewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setMediaViewerUrl(null)}
          role="dialog"
          aria-label="View media"
        >
          <button
            type="button"
            onClick={() => setMediaViewerUrl(null)}
            className="absolute top-4 right-4 rounded-full p-2 text-white bg-black/50 hover:bg-black/70"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={mediaViewerUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}

function LeaguePollComposer({
  threadId,
  isVirtualThread,
  onSent,
  onCancel,
}: {
  threadId: string
  isVirtualThread: boolean
  onSent: () => void
  onCancel: () => void
}) {
  const [question, setQuestion] = useState("")
  const [opt1, setOpt1] = useState("")
  const [opt2, setOpt2] = useState("")
  const [sending, setSending] = useState(false)
  const canSend = question.trim().length > 0 && opt1.trim().length > 0 && opt2.trim().length > 0
  const handleSubmit = async () => {
    if (!canSend || sending) return
    setSending(true)
    try {
      const payload = createLeaguePollPayload(question.trim(), [opt1.trim(), opt2.trim()])
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(threadId)}/${isVirtualThread ? "messages" : "polls"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            isVirtualThread
              ? {
                  body: payload.question,
                  messageType: "poll",
                  metadata: payload,
                }
              : payload
          ),
        }
      )
      if (res.ok) {
        setQuestion("")
        setOpt1("")
        setOpt2("")
        onSent()
      }
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>Create poll</div>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question"
        className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
      />
      <input
        type="text"
        value={opt1}
        onChange={(e) => setOpt1(e.target.value)}
        placeholder="Option 1"
        className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
      />
      <input
        type="text"
        value={opt2}
        onChange={(e) => setOpt2(e.target.value)}
        placeholder="Option 2"
        className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend || sending}
          className="rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
          style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
        >
          {sending ? "Sending…" : "Post poll"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-3 py-1.5 text-[11px]"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const QUICK_EMOJIS = ["👍", "😂", "🔥", "❤️", "👀"]

function LeagueMessageRow({
  msg,
  threadId,
  previousMsg,
  onPin,
  onReaction,
  onStartDm,
  onPollVote,
  onPollClose,
  canClosePoll,
  pollVotingEnabled,
  showPin,
  currentUserId,
  highlighted = false,
  onMediaOpen,
}: {
  msg: PlatformChatMessage
  threadId?: string
  previousMsg?: PlatformChatMessage | null
  onPin: () => void
  onReaction?: (emoji: string, remove?: boolean) => void
  onStartDm?: (username: string) => void
  onPollVote?: (optionIndex: number) => void
  onPollClose?: () => void
  canClosePoll?: boolean
  pollVotingEnabled?: boolean
  showPin: boolean
  currentUserId?: string | null
  highlighted?: boolean
  onMediaOpen?: (url: string) => void
}) {
  const { formatInTimezone } = useUserTimezone()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const reactions = (msg.metadata as any)?.reactions as { emoji: string; count: number; userIds?: string[] }[] | undefined
  const hasUserReacted = (emoji: string): boolean => {
    if (!currentUserId || !Array.isArray(reactions)) return false
    const entry = reactions.find((reaction) => reaction.emoji === emoji)
    return Boolean(entry && Array.isArray(entry.userIds) && entry.userIds.includes(currentUserId))
  }

  const lastSeen = (msg.metadata as any)?.lastSeenAt as string | undefined
  const presenceStatus = lastSeen ? getPresenceStatus(lastSeen) : null
  const senderUsername =
    typeof (msg as { senderUsername?: unknown }).senderUsername === "string"
      ? ((msg as { senderUsername?: string }).senderUsername ?? "").trim()
      : ""
  const profileHref = senderUsername ? `/profile/${encodeURIComponent(senderUsername)}` : null
  const messageDate = new Date(msg.createdAt).getTime()
  const previousDate = previousMsg?.createdAt ? new Date(previousMsg.createdAt).getTime() : null
  const groupedWithPrevious =
    Boolean(previousMsg) &&
    !isLeagueSystemNotice(previousMsg?.messageType ?? "") &&
    previousMsg?.senderUserId &&
    previousMsg.senderUserId === msg.senderUserId &&
    previousMsg.senderUserId !== null &&
    previousDate !== null &&
    Math.abs(messageDate - previousDate) <= 5 * 60 * 1000 &&
    !isLeagueSystemNotice(msg.messageType)
  const isSystemNotice = isLeagueSystemNotice(msg.messageType)
  const systemLabel =
    msg.messageType === "broadcast"
      ? "Commissioner"
      : msg.messageType === "stats_bot"
        ? "Chat Stats Bot"
        : msg.messageType === "pin"
          ? "Pinned"
          : getLeagueSystemNoticeLabel(msg.messageType)
  const poll = parseLeaguePollPayload({
    body: msg.body,
    metadata:
      msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata)
        ? msg.metadata
        : null,
  })
  const pollVotes = poll?.votes ?? {}
  const totalVotes = Object.values(pollVotes).reduce(
    (sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0),
    0
  )
  let displayBody = msg.body
  if (msg.messageType === "broadcast") displayBody = getBroadcastBody(msg.body)
  else if (msg.messageType === "stats_bot") {
    const p = getStatsBotPayload(msg.body)
    displayBody = p ? `Best: ${p.bestTeam} · Worst: ${p.worstTeam} · Top: ${p.bestPlayer}` : msg.body
  } else if (msg.messageType === "pin") displayBody = "Pinned message"
  else if (isSystemNotice) displayBody = getSystemNoticeBody(msg.body)
  const isRichMediaMessage = ["image", "gif", "file", "media"].includes(msg.messageType)

  const mentionRanges = getLeagueMentionRanges(displayBody)
  const renderBodyWithMentions = () => {
    if (mentionRanges.length === 0) return displayBody
    const parts: React.ReactNode[] = []
    let cursor = 0
    for (const range of mentionRanges) {
      if (range.start > cursor) {
        parts.push(displayBody.slice(cursor, range.start))
      }
      parts.push(
        <Link
          key={`${msg.id}-${range.start}-${range.username}`}
          href={`/profile/${encodeURIComponent(range.username)}`}
          className="underline"
          style={{ color: "var(--accent-cyan-strong)" }}
        >
          @{range.username}
        </Link>
      )
      cursor = range.end
    }
    if (cursor < displayBody.length) {
      parts.push(displayBody.slice(cursor))
    }
    return parts
  }

  const actionHref =
    msg.metadata && typeof msg.metadata === "object" && typeof (msg.metadata as Record<string, unknown>).actionHref === "string"
      ? ((msg.metadata as Record<string, unknown>).actionHref as string)
      : null

  return (
    <li
      id={`league-message-${msg.id}`}
      data-message-id={msg.id}
      className={`group rounded-xl px-2 py-1.5 relative ${isSystemNotice ? "" : "hover:bg-black/5"} ${groupedWithPrevious ? "mt-0.5" : ""}`}
      style={
        msg.messageType === "broadcast"
          ? { background: "color-mix(in srgb, var(--accent-amber) 8%, transparent)", borderLeft: "3px solid var(--accent-amber-strong)" }
          : msg.messageType === "stats_bot"
            ? { background: "color-mix(in srgb, var(--accent-cyan-strong) 6%, transparent)" }
            : msg.messageType === "pin"
              ? { background: "color-mix(in srgb, var(--accent-cyan-strong) 6%, transparent)" }
              : highlighted
                ? {
                    border: "1px solid var(--accent-cyan-strong)",
                    background: "color-mix(in srgb, var(--accent-cyan-strong) 8%, transparent)",
                  }
                : undefined
      }
    >
      <div className="flex items-start gap-2">
        {groupedWithPrevious ? (
          <div className="h-7 w-7 shrink-0" />
        ) : profileHref && !isSystemNotice ? (
          <Link
            href={profileHref}
            className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{
              background: "var(--panel2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {msg.senderName.slice(0, 2).toUpperCase()}
          </Link>
        ) : (
          <div
            className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{
              background: msg.messageType === "broadcast" ? "var(--accent-amber-strong)" : "var(--panel2)",
              border: "1px solid var(--border)",
              color: msg.messageType === "broadcast" ? "var(--on-accent-bg)" : "var(--text)",
            }}
          >
            {msg.messageType === "broadcast" ? <Megaphone className="h-3.5 w-3.5" /> : msg.senderName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!groupedWithPrevious && (
            <div className="flex items-center gap-2 flex-wrap">
              {profileHref && !isSystemNotice ? (
                <Link
                  href={profileHref}
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {msg.senderName}
                </Link>
              ) : (
                <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
                  {isSystemNotice ? systemLabel : msg.senderName}
                </span>
              )}
              <span className="text-[10px]" style={{ color: "var(--muted2)" }}>
                {formatInTimezone(msg.createdAt, { hour: "numeric", minute: "2-digit" })}
              </span>
              {lastSeen && !isSystemNotice && (
                <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                  {presenceStatus} · {formatInTimezone(lastSeen, { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
          {poll ? (
            <p className="mt-0.5 text-[11px] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {poll.question}
            </p>
          ) : isRichMediaMessage ? (
            <div className="mt-1">
              <RichMessageRenderer
                message={msg}
                onImageClick={(url) => onMediaOpen?.(url)}
              />
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {renderBodyWithMentions()}
            </p>
          )}
          {actionHref && (
            <Link
              href={actionHref}
              className="mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]"
              style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
            >
              Open details
            </Link>
          )}
          {poll && (
            <div className="mt-1.5 space-y-1">
              {poll.options.map((label, optionIndex) => {
                const count = Array.isArray(pollVotes[String(optionIndex)]) ? pollVotes[String(optionIndex)]!.length : 0
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                return (
                  <button
                    key={`${msg.id}-opt-${optionIndex}`}
                    type="button"
                    onClick={() => onPollVote?.(optionIndex)}
                    disabled={!pollVotingEnabled || Boolean(poll.closed)}
                    className="flex w-full items-center justify-between rounded-lg border px-2 py-1 text-[10px] disabled:opacity-70"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <span className="truncate">{label}</span>
                    <span style={{ color: "var(--muted2)" }}>{pct}% ({count})</span>
                  </button>
                )
              })}
              {canClosePoll && !poll.closed && onPollClose && (
                <button
                  type="button"
                  onClick={onPollClose}
                  className="text-[10px]"
                  style={{ color: "var(--muted2)" }}
                >
                  Close poll
                </button>
              )}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            {reactions?.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReaction?.(r.emoji, hasUserReacted(r.emoji))}
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
                          onReaction(emoji, hasUserReacted(emoji))
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
            {showPin && !isSystemNotice && (
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="rounded p-0.5"
                style={{ color: "var(--muted2)" }}
                aria-label="More"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border p-1 shadow-lg"
                  style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                >
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(displayBody)
                        toast.success("Message copied")
                      } catch {
                        toast.error("Unable to copy message")
                      } finally {
                        setMenuOpen(false)
                      }
                    }}
                    className="w-full rounded px-2 py-1 text-left text-[10px]"
                    style={{ color: "var(--text)" }}
                  >
                    Copy message
                  </button>
                  {senderUsername && (
                    <Link
                      href={`/profile/${encodeURIComponent(senderUsername)}`}
                      onClick={() => setMenuOpen(false)}
                      className="block w-full rounded px-2 py-1 text-left text-[10px]"
                      style={{ color: "var(--text)" }}
                    >
                      View profile
                    </Link>
                  )}
                  {senderUsername && onStartDm && !isSystemNotice && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartDm(senderUsername)
                        setMenuOpen(false)
                      }}
                      className="w-full rounded px-2 py-1 text-left text-[10px]"
                      style={{ color: "var(--text)" }}
                    >
                      Start DM
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
