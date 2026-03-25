"use client"

import { useState } from "react"
import { Megaphone, Send } from "lucide-react"

type Props = {
  threadId: string
  leagueId: string
  onSent?: () => void
  className?: string
}

export default function CommissionerBroadcastForm({
  threadId,
  leagueId,
  onSent,
  className = "",
}: Props) {
  const [announcement, setAnnouncement] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const text = announcement.trim()
    if (!text || sending) return
    setError(null)
    setSending(true)
    try {
      const res = await fetch(
        `/api/shared/chat/threads/${encodeURIComponent(threadId)}/broadcast`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            announcement: text,
            notifyEveryone: true,
            leagueIds: [leagueId],
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Failed to send broadcast")
        return
      }
      setAnnouncement("")
      onSent?.()
    } catch {
      setError("Network error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${className}`}
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--accent-amber) 8%, var(--panel))",
      }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text)" }}>
        <Megaphone className="h-4 w-4" style={{ color: "var(--accent-amber-strong)" }} />
        Commissioner broadcast
      </div>
      <p className="mt-1 text-[10px]" style={{ color: "var(--muted2)" }}>
        Send to @everyone in this league. Mentioned users get a notification.
      </p>
      <textarea
        value={announcement}
        onChange={(e) => setAnnouncement(e.target.value)}
        data-testid="commissioner-announcement-input"
        placeholder="Announcement (e.g. Trade deadline Sunday 11:59 PM ET)"
        rows={2}
        className="mt-2 w-full resize-none rounded-lg border px-2.5 py-1.5 text-xs outline-none"
        style={{
          borderColor: "var(--border)",
          background: "var(--panel2)",
          color: "var(--text)",
        }}
      />
      {error && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--accent-red-strong)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!announcement.trim() || sending}
        data-testid="commissioner-announcement-send"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50"
        style={{
          borderColor: "var(--accent-amber-strong)",
          color: "var(--accent-amber-strong)",
          background: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
        }}
      >
        <Send className="h-3.5 w-3.5" />
        Send @everyone
      </button>
    </div>
  )
}
