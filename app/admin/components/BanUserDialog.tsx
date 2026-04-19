"use client"

import { useEffect, useState } from "react"
import { Loader2, Shield, X, CheckCircle, XCircle } from "lucide-react"

/** Hours for presets; null means permanent (no expiresAt). */
const DURATIONS: Array<{ hours: number | null; label: string }> = [
  { hours: 1, label: "1 hour" },
  { hours: 2, label: "2 hours" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 7 * 24, label: "7 days" },
  { hours: 30 * 24, label: "30 days" },
  { hours: 90 * 24, label: "90 days" },
  { hours: 365 * 24, label: "1 year" },
  { hours: null, label: "Permanent" },
]

export type BanDialogMode = "single" | "bulk"

export type BanDialogResult = {
  ok: boolean
  message: string
}

async function runBan(args: {
  userId: string
  actionType: "ban" | "suspend"
  expiresAt: string | null
  reason: string
}): Promise<boolean> {
  const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(args.userId)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actionType: args.actionType,
      reason: args.reason,
      expiresAt: args.expiresAt ?? undefined,
    }),
  })
  return res.ok
}

export function BanUserDialog({
  mode,
  targetLabel,
  targetIds,
  onClose,
  onFinished,
}: {
  mode: BanDialogMode
  /** For single: "email · username"; for bulk: "3 selected users". */
  targetLabel: string
  targetIds: string[]
  onClose: () => void
  onFinished: (result: BanDialogResult) => void
}) {
  const [durationIndex, setDurationIndex] = useState(4) // default 7 days
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setMessage(null)
    setReason("")
    setDurationIndex(4)
  }, [targetIds.join(",")])

  const duration = DURATIONS[durationIndex]
  const isPermanent = duration.hours == null

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (targetIds.length === 0) return
    if (!reason.trim()) {
      setMessage({ ok: false, text: "Reason is required." })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const actionType: "ban" | "suspend" = isPermanent ? "ban" : "suspend"
      const expiresAt = isPermanent
        ? null
        : new Date(Date.now() + (duration.hours ?? 0) * 60 * 60 * 1000).toISOString()

      const results = await Promise.all(
        targetIds.map((id) =>
          runBan({ userId: id, actionType, expiresAt, reason: reason.trim() }).catch(() => false),
        ),
      )
      const okCount = results.filter(Boolean).length
      const verb = isPermanent ? "Banned" : "Suspended"
      const result: BanDialogResult = {
        ok: okCount > 0,
        message:
          mode === "single"
            ? okCount > 0
              ? `${verb} user${isPermanent ? " permanently" : ` for ${duration.label}`}.`
              : "Action failed."
            : `${verb} ${okCount}/${targetIds.length} selected user${targetIds.length === 1 ? "" : "s"}${isPermanent ? " permanently" : ` for ${duration.label}`}.`,
      }
      setMessage({ ok: result.ok, text: result.message })
      onFinished(result)
      if (result.ok) {
        setTimeout(() => onClose(), 900)
      }
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || "Action failed." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-rose-400">
              <Shield className="h-3.5 w-3.5" /> {mode === "bulk" ? "Bulk ban / suspend" : "Ban / suspend user"}
            </div>
            <p className="mt-1 truncate text-[14px] font-semibold" style={{ color: "var(--text)" }}>
              {targetLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-1.5"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Duration
            <select
              value={durationIndex}
              onChange={(e) => setDurationIndex(Number(e.target.value))}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {DURATIONS.map((d, i) => (
                <option key={d.label} value={i}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Reason <span className="text-rose-300">*</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              required
              placeholder="Rule violation, harassment report, …"
              rows={2}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {isPermanent ? "Banning…" : "Suspending…"}
              </>
            ) : isPermanent ? (
              `Ban permanently${targetIds.length > 1 ? ` · ${targetIds.length} users` : ""}`
            ) : (
              `Suspend for ${duration.label}${targetIds.length > 1 ? ` · ${targetIds.length} users` : ""}`
            )}
          </button>
        </form>

        {message ? (
          <div
            role="alert"
            className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              message.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {message.ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
