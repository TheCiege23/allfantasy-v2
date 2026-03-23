"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  MessageCircle,
  Send,
  Loader2,
  Plus,
  ChevronLeft,
  Smile,
  ImageIcon,
  FileImage,
  X,
  BarChart3,
} from "lucide-react"
import type { PlatformChatMessage, PlatformChatThread } from "@/types/platform-shared"
import {
  getDMThreads,
  getGroupThreads,
  sortThreadsByLastMessage,
  getConversationDisplayTitle,
  getUnreadCount,
  getUnreadBadgeLabel,
  hasUnread,
  getThreadMessagesUrl,
  getLeaveGroupUrl,
  handleComposerKeyDown,
} from "@/lib/conversations"
import {
  EMOJI_LIST,
  appendEmoji,
  isGifSearchConfigured,
  isValidGifOrImageUrl,
  validateImageFile,
  getMessagePayloadForImage,
  getMessagePayloadForGif,
} from "@/lib/rich-message"
import type { AttachmentPreview } from "@/lib/rich-message"
import {
  parseMentions,
  notifyMentions,
  getMentionQueryFromInput,
  getPinnedUrl,
  getUnpinUrl,
  getUnpinPayload,
  getPinnedDisplayBody,
  getReferencedMessageIdFromPin,
  MessageInteractionRenderer,
  getCreatePollPayload,
  POLL_MAX_OPTIONS,
} from "@/lib/social-chat"
import PinnedSection from "@/components/chat/PinnedSection"
import MessageActionsMenu from "@/components/chat/MessageActionsMenu"
import { IdentityImageRenderer } from "@/components/identity/IdentityImageRenderer"
import {
  BLOCKED_LIST_API,
  BLOCK_API,
  UNBLOCK_API,
  REPORT_MESSAGE_API,
  REPORT_USER_API,
  getBlockPayload,
  getUnblockPayload,
  getReportMessagePayload,
  getReportUserPayload,
  REPORT_REASONS,
} from "@/lib/moderation"
import { useUserTimezone } from "@/hooks/useUserTimezone"

const TABS = [
  { id: "dm" as const, label: "Private DMs" },
  { id: "groups" as const, label: "Group Chats" },
  { id: "ai" as const, label: "AI Chatbot" },
]

export default function MessagesContent() {
  const { formatInTimezone } = useUserTimezone()
  const searchParams = useSearchParams()
  const threadIdFromUrl = searchParams.get("thread")
  const startUsernameFromUrl = searchParams.get("start")

  const [threads, setThreads] = useState<PlatformChatThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [activeTab, setActiveTab] = useState<"dm" | "groups" | "ai">("dm")
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadIdFromUrl)
  const [messages, setMessages] = useState<PlatformChatMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [startDmUsername, setStartDmUsername] = useState("")
  const [startDmOpen, setStartDmOpen] = useState(false)
  const [startDmLoading, setStartDmLoading] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState("")
  const [newGroupUsernames, setNewGroupUsernames] = useState("")
  const [newGroupLoading, setNewGroupLoading] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null)
  const [gifUrlInput, setGifUrlInput] = useState("")
  const [gifUrlOpen, setGifUrlOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [pinned, setPinned] = useState<PlatformChatMessage[]>([])
  const [pollCreateOpen, setPollCreateOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [pollCreating, setPollCreating] = useState(false)
  const [threadMembers, setThreadMembers] = useState<Array<{ id: string; username: string; displayName: string | null }>>([])
  const [mentionSelectIndex, setMentionSelectIndex] = useState(0)
  const [blockedUsers, setBlockedUsers] = useState<Array<{ userId: string; username: string | null; displayName: string | null }>>([])
  const [reportMessageOpen, setReportMessageOpen] = useState<{ messageId: string; threadId: string } | null>(null)
  const [reportUserOpen, setReportUserOpen] = useState<{ userId: string; username: string } | null>(null)
  const [reportReason, setReportReason] = useState("other")
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState<{ userId: string; username: string } | null>(null)
  const [blockedListOpen, setBlockedListOpen] = useState(false)
  const [mutedThreads, setMutedThreads] = useState<Set<string>>(new Set())

  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id ?? null

  const mentionState = getMentionQueryFromInput(input)
  const mentionSuggestions = mentionState
    ? threadMembers
        .filter((m) => m.id !== currentUserId && m.username.toLowerCase().startsWith(mentionState.query))
        .slice(0, 8)
    : []
  const showMentionDropdown = mentionState && mentionSuggestions.length > 0

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true)
    try {
      const res = await fetch("/api/shared/chat/threads", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      const list: PlatformChatThread[] = Array.isArray(json?.threads) ? json.threads : []
      setThreads(list)
    } finally {
      setLoadingThreads(false)
    }
  }, [])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (threadIdFromUrl) setSelectedThreadId(threadIdFromUrl)
  }, [threadIdFromUrl])

  useEffect(() => {
    if (startUsernameFromUrl?.trim()) {
      setStartDmUsername(startUsernameFromUrl.trim())
      setStartDmOpen(true)
      setActiveTab("dm")
      const url = new URL(window.location.href)
      url.searchParams.delete("start")
      window.history.replaceState(null, "", url.pathname + url.search)
    }
  }, [startUsernameFromUrl])

  const dmThreads = sortThreadsByLastMessage(getDMThreads(threads))
  const groupThreads = sortThreadsByLastMessage(getGroupThreads(threads))
  const currentList = activeTab === "dm" ? dmThreads : activeTab === "groups" ? groupThreads : []

  const loadMessages = useCallback(async (tid: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(getThreadMessagesUrl(tid), { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      setMessages(Array.isArray(json?.messages) ? json.messages : [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const loadPinned = useCallback(async (tid: string) => {
    try {
      const res = await fetch(getPinnedUrl(tid), { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      setPinned(Array.isArray(json?.pinned) ? json.pinned : [])
    } catch {
      setPinned([])
    }
  }, [])

  const loadThreadMembers = useCallback(async (tid: string) => {
    try {
      const res = await fetch(`/api/shared/chat/threads/${encodeURIComponent(tid)}/members`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      setThreadMembers(Array.isArray(json?.members) ? json.members : [])
    } catch {
      setThreadMembers([])
    }
  }, [])

  const loadBlockedList = useCallback(async () => {
    try {
      const res = await fetch(BLOCKED_LIST_API, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      setBlockedUsers(Array.isArray(json?.blockedUsers) ? json.blockedUsers : [])
    } catch {
      setBlockedUsers([])
    }
  }, [])

  useEffect(() => {
    loadBlockedList()
  }, [loadBlockedList])

  useEffect(() => {
    setMentionSelectIndex(0)
  }, [mentionState?.query, mentionSuggestions.length])

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId)
      loadPinned(selectedThreadId)
      loadThreadMembers(selectedThreadId)
    } else {
      setMessages([])
      setPinned([])
      setThreadMembers([])
    }
  }, [selectedThreadId, loadMessages, loadPinned, loadThreadMembers])

  const handleSend = useCallback(async () => {
    if (sending || !selectedThreadId) return
    const text = input.trim()
    const hasAttachment = attachmentPreview !== null
    if (!text && !hasAttachment) return

    setSending(true)
    setUploadError(null)
    try {
      if (hasAttachment && attachmentPreview) {
        if (attachmentPreview.type === "image" && "url" in attachmentPreview) {
          const payload = getMessagePayloadForImage(attachmentPreview.url)
          const res = await fetch(
            `/api/shared/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...payload, metadata: payload.metadata }),
            }
          )
          const json = await res.json().catch(() => ({}))
          const created: PlatformChatMessage | null = json?.message ?? null
          if (created) {
            setMessages((prev) => [...prev, created])
            setAttachmentPreview(null)
          }
        } else if (attachmentPreview.type === "gif") {
          const payload = getMessagePayloadForGif(attachmentPreview.url)
          const res = await fetch(
            `/api/shared/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...payload, metadata: payload.metadata }),
            }
          )
          const json = await res.json().catch(() => ({}))
          const created: PlatformChatMessage | null = json?.message ?? null
          if (created) {
            setMessages((prev) => [...prev, created])
            setAttachmentPreview(null)
          }
        }
      } else {
        setInput("")
        const res = await fetch(
          `/api/shared/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`,
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
          const mentioned = parseMentions(text)
          if (mentioned.length > 0) notifyMentions(selectedThreadId, created.id, mentioned).catch(() => {})
        }
      }
      loadThreads()
    } catch {
      if (!hasAttachment) setInput(text)
    } finally {
      setSending(false)
    }
  }, [input, sending, selectedThreadId, attachmentPreview, loadThreads])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput((prev) => appendEmoji(prev, emoji))
    setEmojiPickerOpen(false)
  }, [])

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      const result = validateImageFile(file)
      if (!result.valid) {
        setUploadError(result.error ?? "Invalid image")
        return
      }
      setUploadError(null)
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/shared/chat/upload", { method: "POST", body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setUploadError(data?.error ?? "Upload failed")
          return
        }
        const url = data?.url
        if (url) setAttachmentPreview({ type: "image", file, url })
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const handleGifUrlSubmit = useCallback(() => {
    const url = gifUrlInput.trim()
    if (!isValidGifOrImageUrl(url)) {
      setUploadError("Enter a valid https URL")
      return
    }
    setUploadError(null)
    setAttachmentPreview({ type: "gif", url })
    setGifUrlInput("")
    setGifUrlOpen(false)
  }, [gifUrlInput])

  const canSend = (input.trim() || attachmentPreview) && !sending

  const applyMentionSuggestion = useCallback((username: string) => {
    if (!mentionState) return
    const before = input.slice(0, mentionState.startIndex)
    const after = `${username} `
    setInput(before + "@" + after)
    setMentionSelectIndex(0)
  }, [input, mentionState])

  const handleComposerKeyDownWithMentions = useCallback(
    (e: React.KeyboardEvent, onSend: () => void, canSendNow: boolean) => {
      if (showMentionDropdown && mentionSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setMentionSelectIndex((i) => (i + 1) % mentionSuggestions.length)
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setMentionSelectIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length)
          return
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault()
          applyMentionSuggestion(mentionSuggestions[mentionSelectIndex].username)
          return
        }
        if (e.key === "Escape") {
          setMentionSelectIndex(0)
        }
      }
      handleComposerKeyDown(e, onSend, canSendNow)
    },
    [showMentionDropdown, mentionSuggestions, mentionSelectIndex, applyMentionSuggestion]
  )

  const handleStartDm = useCallback(async () => {
    const username = startDmUsername.trim()
    if (!username || startDmLoading) return
    setStartDmLoading(true)
    try {
      const res = await fetch("/api/shared/chat/dm/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const json = await res.json().catch(() => ({}))
      const thread: PlatformChatThread | null = json?.thread ?? null
      if (thread) {
        setStartDmOpen(false)
        setStartDmUsername("")
        setSelectedThreadId(thread.id)
        setActiveTab("dm")
        loadThreads()
        window.history.replaceState(null, "", `/messages?thread=${encodeURIComponent(thread.id)}`)
      }
    } finally {
      setStartDmLoading(false)
    }
  }, [startDmUsername, startDmLoading, loadThreads])

  const handleCreateGroup = useCallback(async () => {
    const usernames = newGroupUsernames.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean)
    if (usernames.length < 1 || newGroupLoading) return
    setNewGroupLoading(true)
    try {
      const res = await fetch("/api/shared/chat/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadType: "group",
          title: newGroupTitle.trim() || undefined,
          usernames,
        }),
      })
      const json = await res.json().catch(() => ({}))
      const thread: PlatformChatThread | null = json?.thread ?? null
      if (thread) {
        setNewGroupOpen(false)
        setNewGroupTitle("")
        setNewGroupUsernames("")
        setSelectedThreadId(thread.id)
        setActiveTab("groups")
        loadThreads()
        window.history.replaceState(null, "", `/messages?thread=${encodeURIComponent(thread.id)}`)
      }
    } finally {
      setNewGroupLoading(false)
    }
  }, [newGroupTitle, newGroupUsernames, newGroupLoading, loadThreads])

  const handleLeaveGroup = useCallback(
    async (tid: string) => {
      try {
        const res = await fetch(getLeaveGroupUrl(tid), { method: "POST" })
        if (res.ok) {
          if (selectedThreadId === tid) setSelectedThreadId(null)
          loadThreads()
        }
      } catch {
        // ignore
      }
    },
    [selectedThreadId, loadThreads]
  )

  const selectedThread = threads.find((t) => t.id === selectedThreadId)

  return (
    <div className="flex flex-col gap-4">
      <section className="mode-panel rounded-2xl p-3">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-lg px-4 py-2 text-sm transition"
              style={
                activeTab === tab.id
                  ? { background: "var(--text)", color: "var(--bg)" }
                  : { background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "ai" && (
        <section className="mode-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold mode-text">AI Chatbot</h3>
          <p className="mt-1 text-sm mode-muted">
            Ask one question at a time for trade, waiver, draft, and strategy coaching.
          </p>
          <Link
            href="/af-legacy?tab=chat"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--accent-cyan) 45%, var(--border))",
              color: "var(--accent-cyan-strong)",
              background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)",
            }}
          >
            Open Legacy AI Chat
          </Link>
        </section>
      )}

      {(activeTab === "dm" || activeTab === "groups") && (
        <section
          className="mode-panel rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--border)", minHeight: "420px" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
            <div
              className="border-b md:border-b-0 md:border-r flex flex-col"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-col gap-1 p-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold mode-text">
                    {activeTab === "dm" ? "Conversations" : "Groups"}
                  </span>
                  <button
                    type="button"
                    onClick={() => (activeTab === "dm" ? setStartDmOpen(true) : setNewGroupOpen(true))}
                    className="rounded-lg border p-1.5"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    title={activeTab === "dm" ? "New DM" : "New group"}
                    aria-label={activeTab === "dm" ? "New DM" : "New group"}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setBlockedListOpen(true)}
                  className="text-left text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Blocked users {blockedUsers.length > 0 ? `(${blockedUsers.length})` : ""}
                </button>
              </div>
              <ul className="overflow-y-auto flex-1">
                {loadingThreads ? (
                  <li className="p-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} />
                  </li>
                ) : currentList.length === 0 ? (
                  <li className="p-4 text-sm mode-muted">
                    {activeTab === "dm" ? "No DMs yet. Start a conversation." : "No groups yet. Create one."}
                  </li>
                ) : (
                  currentList.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedThreadId(t.id)
                          window.history.replaceState(null, "", `/messages?thread=${encodeURIComponent(t.id)}`)
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition"
                        style={{
                          background: selectedThreadId === t.id ? "color-mix(in srgb, var(--accent-cyan-strong) 10%, transparent)" : "transparent",
                          color: selectedThreadId === t.id ? "var(--accent-cyan-strong)" : "var(--text)",
                        }}
                      >
                        <span className="min-w-0 truncate text-sm">{getConversationDisplayTitle(t)}</span>
                        {hasUnread(t) && (
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
                          >
                            {getUnreadBadgeLabel(getUnreadCount(t))}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="flex flex-col min-h-[320px]">
              {selectedThreadId ? (
                <>
                  <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(null)}
                      className="md:hidden rounded-lg border p-1.5"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                      aria-label="Back"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-medium truncate mode-text">
                      {selectedThread ? getConversationDisplayTitle(selectedThread) : "Conversation"}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      {selectedThreadId && (
                        <button
                          type="button"
                          onClick={async () => {
                            const next = !mutedThreads.has(selectedThreadId)
                            try {
                              const res = await fetch(
                                `/api/shared/chat/threads/${encodeURIComponent(selectedThreadId)}/mute`,
                                {
                                  method: "POST",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ muted: next }),
                                }
                              )
                              if (res.ok) setMutedThreads((s) => (next ? new Set(s).add(selectedThreadId) : (() => { const n = new Set(s); n.delete(selectedThreadId); return n })()))
                            } catch {
                              // ignore
                            }
                          }}
                          className="rounded-lg border p-1.5"
                          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                          title={mutedThreads.has(selectedThreadId) ? "Unmute" : "Mute"}
                          aria-label={mutedThreads.has(selectedThreadId) ? "Unmute" : "Mute"}
                        >
                          {mutedThreads.has(selectedThreadId) ? (
                            <span className="text-xs">Unmute</span>
                          ) : (
                            <span className="text-xs">Mute</span>
                          )}
                        </button>
                      )}
                      {selectedThread?.threadType === "group" && (
                        <button
                          type="button"
                          onClick={() => handleLeaveGroup(selectedThread.id)}
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
                    {selectedThreadId && pinned.length > 0 && (
                      <PinnedSection
                        pinned={pinned}
                        onUnpin={async (pinMessageId) => {
                          try {
                            await fetch(getUnpinUrl(selectedThreadId), {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify(getUnpinPayload(pinMessageId)),
                            })
                            loadPinned(selectedThreadId)
                            loadMessages(selectedThreadId)
                          } catch {
                            // ignore
                          }
                        }}
                        canUnpin={true}
                        className="mb-3"
                      />
                    )}
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--muted)" }} />
                      </div>
                    ) : messages.filter((m) => m.messageType !== "pin").length === 0 ? (
                      <p className="text-sm mode-muted py-4 text-center">No messages yet. Say something.</p>
                    ) : (
                      messages
                        .filter((m) => m.messageType !== "pin")
                        .map((m) => (
                          <div
                            key={m.id}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{
                              background: "color-mix(in srgb, var(--panel2) 80%, transparent)",
                              color: "var(--text)",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <IdentityImageRenderer
                                avatarUrl={m.senderAvatarUrl ?? null}
                                avatarPreset={m.senderAvatarPreset ?? null}
                                displayName={m.senderName}
                                username={null}
                                size="sm"
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs">{m.senderName}</span>
                                  <span className="text-[10px] mode-muted">
                                    {formatInTimezone(m.createdAt, { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                  <div className="ml-auto">
                                    <MessageActionsMenu
                                      messageId={m.id}
                                      threadId={selectedThreadId!}
                                      senderUserId={m.senderUserId}
                                      senderName={m.senderName}
                                      isBlocked={m.senderUserId ? blockedUsers.some((b) => b.userId === m.senderUserId) : false}
                                      onReportMessage={() => setReportMessageOpen({ messageId: m.id, threadId: selectedThreadId! })}
                                      onReportUser={() => m.senderUserId && setReportUserOpen({ userId: m.senderUserId, username: m.senderName })}
                                      onBlockUser={() => m.senderUserId && setBlockConfirmOpen({ userId: m.senderUserId, username: m.senderName })}
                                      onUnblockUser={async () => {
                                        if (!m.senderUserId) return
                                        try {
                                          await fetch(UNBLOCK_API, {
                                            method: "POST",
                                            headers: { "content-type": "application/json" },
                                            body: JSON.stringify(getUnblockPayload(m.senderUserId)),
                                          })
                                          loadBlockedList()
                                          loadMessages(selectedThreadId!)
                                          loadThreads()
                                        } catch {
                                          // ignore
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                <MessageInteractionRenderer
                                  message={m}
                                  threadId={selectedThreadId!}
                                  currentUserId={currentUserId}
                                  pinnedReferencedIds={new Set(pinned.map(getReferencedMessageIdFromPin).filter(Boolean) as string[])}
                                  onReactionUpdate={() => loadMessages(selectedThreadId!)}
                                  onPinUpdate={() => { loadPinned(selectedThreadId!); loadMessages(selectedThreadId!) }}
                                  onVote={() => loadMessages(selectedThreadId!)}
                                  onPollClose={() => loadMessages(selectedThreadId!)}
                                  onImageClick={(url) => setMediaViewerUrl(url)}
                                  getMessageSnippet={(msgId) => {
                                    const msg = messages.find((x) => x.id === msgId)
                                    const b = msg?.body ?? ""
                                    return b.slice(0, 80) + (b.length > 80 ? "…" : "")
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  <div className="relative">
                  {uploadError && (
                    <p className="px-3 py-1 text-xs" style={{ color: "var(--error)" }}>{uploadError}</p>
                  )}
                  {attachmentPreview && (
                    <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                      {attachmentPreview.type === "image" && (
                        <img src={attachmentPreview.url} alt="Preview" className="h-14 w-14 rounded object-cover" />
                      )}
                      {attachmentPreview.type === "gif" && (
                        <img src={attachmentPreview.url} alt="GIF" className="h-14 w-14 rounded object-cover" />
                      )}
                      <span className="text-xs mode-muted flex-1 truncate">
                        {attachmentPreview.type === "image" ? "Image" : "GIF"}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setAttachmentPreview(null); setUploadError(null) }}
                        className="rounded p-1"
                        style={{ color: "var(--muted)" }}
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 p-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen((o) => !o)}
                        className="rounded-lg p-2"
                        style={{ color: "var(--muted)" }}
                        title="Emoji"
                        aria-label="Emoji"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="rounded-lg p-2 disabled:opacity-50"
                        style={{ color: "var(--muted)" }}
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
                        onClick={() => setGifUrlOpen((o) => !o)}
                        className="rounded-lg p-2"
                        style={{ color: "var(--muted)" }}
                        title="GIF"
                        aria-label="GIF"
                      >
                        <FileImage className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPollCreateOpen(true)}
                        className="rounded-lg p-2"
                        style={{ color: "var(--muted)" }}
                        title="Create poll"
                        aria-label="Create poll"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => handleComposerKeyDownWithMentions(e, handleSend, Boolean(canSend))}
                      placeholder="Message… (type @ to mention)"
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                    />
                    {showMentionDropdown && mentionState && (
                      <div
                        className="absolute bottom-full left-3 right-12 mb-1 rounded-xl border shadow-lg z-10 max-h-48 overflow-y-auto"
                        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                      >
                        <p className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Mention
                        </p>
                        {mentionSuggestions.map((m, i) => {
                          const selected = i === Math.min(mentionSelectIndex, mentionSuggestions.length - 1)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => applyMentionSuggestion(m.username)}
                              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
                              style={{
                                background: selected ? "color-mix(in srgb, var(--accent-cyan-strong) 12%, transparent)" : "transparent",
                                color: "var(--text)",
                              }}
                            >
                              <span className="font-medium">@{m.username}</span>
                              {m.displayName && (
                                <span className="truncate text-xs" style={{ color: "var(--muted)" }}>{m.displayName}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                      style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  {emojiPickerOpen && (
                    <div
                      className="absolute bottom-full left-3 mb-1 rounded-xl border p-2 shadow-lg z-10"
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
                      className="absolute bottom-full left-3 mb-1 rounded-xl border p-3 shadow-lg z-10 w-80"
                      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                    >
                      {isGifSearchConfigured() ? (
                        <p className="text-xs mode-muted mb-2">GIF search is available. Paste a GIF URL below to send.</p>
                      ) : (
                        <p className="text-xs mode-muted mb-2">Paste a GIF or image URL to send.</p>
                      )}
                      <input
                        type="url"
                        value={gifUrlInput}
                        onChange={(e) => setGifUrlInput(e.target.value)}
                        placeholder="https://…"
                        className="w-full rounded-lg border px-2 py-1.5 text-sm mb-2"
                        style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setGifUrlOpen(false); setGifUrlInput("") }}
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
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle className="h-12 w-12 mb-3" style={{ color: "var(--muted)" }} />
                  <p className="text-sm mode-muted">
                    {activeTab === "dm" ? "Select a conversation or start a new DM." : "Select a group or create one."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Report message modal */}
      {reportMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Report message</h3>
            <p className="mt-1 text-sm mode-muted">Choose a reason. Reports are reviewed by moderators.</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setReportMessageOpen(null); setReportReason("other") }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={async () => {
                  setReportSubmitting(true)
                  try {
                    const res = await fetch(REPORT_MESSAGE_API, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(getReportMessagePayload(reportMessageOpen.messageId, reportMessageOpen.threadId, reportReason)),
                    })
                    if (res.ok) {
                      setReportSuccess(true)
                      setReportMessageOpen(null)
                      setReportReason("other")
                      setTimeout(() => setReportSuccess(false), 3000)
                    }
                  } finally {
                    setReportSubmitting(false)
                  }
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                {reportSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report user modal */}
      {reportUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Report user</h3>
            <p className="mt-1 text-sm mode-muted">Reporting @{reportUserOpen.username}. Reports are reviewed by moderators.</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setReportUserOpen(null); setReportReason("other") }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={async () => {
                  setReportSubmitting(true)
                  try {
                    const res = await fetch(REPORT_USER_API, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(getReportUserPayload(reportUserOpen.userId, reportReason)),
                    })
                    if (res.ok) {
                      setReportSuccess(true)
                      setReportUserOpen(null)
                      setReportReason("other")
                      setTimeout(() => setReportSuccess(false), 3000)
                    }
                  } finally {
                    setReportSubmitting(false)
                  }
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                {reportSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block confirmation modal */}
      {blockConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Block user?</h3>
            <p className="mt-1 text-sm mode-muted">
              Block @{blockConfirmOpen.username}? They won&apos;t be able to message you in shared threads. You can unblock later from Blocked users.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setBlockConfirmOpen(null)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch(BLOCK_API, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(getBlockPayload(blockConfirmOpen.userId)),
                    })
                    loadBlockedList()
                    if (selectedThreadId) {
                      loadMessages(selectedThreadId)
                      loadThreads()
                    }
                    setBlockConfirmOpen(null)
                  } catch {
                    // ignore
                  }
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked users list modal */}
      {blockedListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4 max-h-[80vh] overflow-hidden flex flex-col"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Blocked users</h3>
            <p className="mt-1 text-sm mode-muted">Unblock to receive messages from them again.</p>
            <ul className="mt-3 overflow-y-auto flex-1 min-h-0 space-y-2">
              {blockedUsers.length === 0 ? (
                <li className="text-sm mode-muted py-4 text-center">No blocked users.</li>
              ) : (
                blockedUsers.map((u) => (
                  <li key={u.userId} className="flex items-center justify-between gap-2 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm truncate">@{u.username ?? u.displayName ?? u.userId}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await fetch(UNBLOCK_API, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify(getUnblockPayload(u.userId)),
                          })
                          loadBlockedList()
                          if (selectedThreadId) {
                            loadMessages(selectedThreadId)
                            loadThreads()
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      className="rounded-lg border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--border)", color: "var(--accent-cyan-strong)" }}
                    >
                      Unblock
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setBlockedListOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {reportSuccess && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border px-4 py-2 text-sm shadow-lg"
          style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          Report submitted. Thank you.
        </div>
      )}

      {startDmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Start a conversation</h3>
            <p className="mt-1 text-sm mode-muted">Enter their username (e.g. jane)</p>
            <input
              type="text"
              value={startDmUsername}
              onChange={(e) => setStartDmUsername(e.target.value)}
              placeholder="Username"
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setStartDmOpen(false); setStartDmUsername("") }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartDm}
                disabled={!startDmUsername.trim() || startDmLoading}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                {startDmLoading ? "Opening…" : "Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {newGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">New group</h3>
            <p className="mt-1 text-sm mode-muted">Add usernames separated by comma or space</p>
            <input
              type="text"
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              placeholder="Group name (optional)"
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            />
            <input
              type="text"
              value={newGroupUsernames}
              onChange={(e) => setNewGroupUsernames(e.target.value)}
              placeholder="user1, user2, user3"
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setNewGroupOpen(false); setNewGroupTitle(""); setNewGroupUsernames("") }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={newGroupUsernames.trim().length < 1 || newGroupLoading}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                {newGroupLoading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pollCreateOpen && selectedThreadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <h3 className="text-lg font-semibold mode-text">Create poll</h3>
            <p className="mt-1 text-sm mode-muted">Question and at least two options.</p>
            <input
              type="text"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Question"
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            />
            <div className="mt-2 space-y-2">
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions]
                    next[i] = e.target.value
                    setPollOptions(next)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                />
              ))}
            </div>
            {pollOptions.length < POLL_MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => setPollOptions((o) => [...o, ""])}
                className="mt-2 text-xs"
                style={{ color: "var(--accent-cyan-strong)" }}
              >
                + Add option
              </button>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setPollCreateOpen(false); setPollQuestion(""); setPollOptions(["", ""]) }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2 || pollCreating}
                onClick={async () => {
                  const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
                  if (!pollQuestion.trim() || opts.length < 2) return
                  setPollCreating(true)
                  try {
                    const res = await fetch(
                      `/api/shared/chat/threads/${encodeURIComponent(selectedThreadId)}/polls`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(getCreatePollPayload(pollQuestion.trim(), opts)),
                      }
                    )
                    if (res.ok) {
                      setPollCreateOpen(false)
                      setPollQuestion("")
                      setPollOptions(["", ""])
                      loadMessages(selectedThreadId)
                    }
                  } finally {
                    setPollCreating(false)
                  }
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
              >
                {pollCreating ? "Creating…" : "Create poll"}
              </button>
            </div>
          </div>
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
    </div>
  )
}
