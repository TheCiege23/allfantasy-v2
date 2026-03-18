"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Loader2, Send, Check } from "lucide-react"

interface RecapPayload {
  title: string
  body: string
  actionHref: string
  actionLabel: string
  leagueViews?: number
  bracketViews?: number
  aiUses?: number
}

export interface WeeklySummaryCardProps {
  className?: string
}

/**
 * Fetches weekly recap and lets the user view it or send it to their notifications.
 */
export function WeeklySummaryCard({ className = "" }: WeeklySummaryCardProps) {
  const [recap, setRecap] = useState<RecapPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch("/api/engagement/weekly-recap", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.recap) setRecap(d.recap)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSend() {
    if (sending || sent) return
    setSending(true)
    try {
      const res = await fetch("/api/engagement/weekly-recap", { method: "POST" })
      if (res.ok) setSent(true)
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  if (loading || !recap) return null

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white">Weekly summary</span>
      </div>
      <p className="text-sm text-white/80">{recap.title}</p>
      <p className="text-xs text-white/60 mt-1">{recap.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={recap.actionHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30"
        >
          {recap.actionLabel}
        </Link>
        {!sent ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send to my notifications
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Sent
          </span>
        )}
      </div>
    </div>
  )
}
