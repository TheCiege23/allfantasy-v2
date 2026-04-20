"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Power,
  Zap,
  AlertTriangle,
} from "lucide-react"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from "@/lib/automated-blog/types"
import type { BlogCategory } from "@/lib/automated-blog/types"

type Schedule = {
  id: string
  sport: string
  category: string
  topicHint: string | null
  cadenceDays: number
  isActive: boolean
  autoPublish: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
  lastRunArticleId: string | null
  lastRunError: string | null
  runCount: number
  createdByEmail: string
  createdAt: string
  updatedAt: string
}

/** Computes `lastRunAt + cadenceDays` for the "next run" hint. */
function nextRunAt(s: Schedule): Date | null {
  if (!s.isActive) return null
  if (!s.lastRunAt) return new Date()
  return new Date(new Date(s.lastRunAt).getTime() + s.cadenceDays * 24 * 60 * 60 * 1000)
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const absMin = Math.abs(diff) / 60_000
  if (absMin < 60) return `${Math.max(1, Math.round(absMin))}m ${diff >= 0 ? "ago" : "from now"}`
  const absHr = absMin / 60
  if (absHr < 48) return `${Math.round(absHr)}h ${diff >= 0 ? "ago" : "from now"}`
  const days = Math.round(absHr / 24)
  return `${days}d ${diff >= 0 ? "ago" : "from now"}`
}

/** Schedules panel — sits inside the existing Blog tab for streamlining. */
export function BlogSchedulesPanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [rowAction, setRowAction] = useState<string | null>(null)

  // Add form state
  const [adding, setAdding] = useState(false)
  const [sport, setSport] = useState(String(SUPPORTED_SPORTS[0]))
  const [category, setCategory] = useState<BlogCategory>(BLOG_CATEGORIES[0])
  const [cadenceDays, setCadenceDays] = useState(7)
  const [autoPublish, setAutoPublish] = useState(false)
  const [topicHint, setTopicHint] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/blog-schedules", { cache: "no-store" })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSchedules(data.schedules ?? [])
      } else {
        throw new Error(data?.error || "Failed to load schedules")
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setAdding(true)
    try {
      const res = await fetch("/api/admin/blog-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          category,
          cadenceDays,
          autoPublish,
          topicHint: topicHint.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Create failed")
      setMessage({ ok: true, text: `Scheduled ${sport} / ${BLOG_CATEGORY_LABELS[category]} every ${cadenceDays}d.` })
      setTopicHint("")
      await load()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Create failed" })
    } finally {
      setAdding(false)
    }
  }

  async function updateSchedule(s: Schedule, patch: Partial<Pick<Schedule, "isActive" | "autoPublish" | "cadenceDays">>) {
    const key = Object.keys(patch).join(",")
    setRowAction(`${key}-${s.id}`)
    try {
      const res = await fetch(`/api/admin/blog-schedules/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Update failed")
      await load()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Update failed" })
    } finally {
      setRowAction(null)
    }
  }

  async function removeSchedule(s: Schedule) {
    if (
      !window.confirm(
        `Remove the ${s.sport} / ${BLOG_CATEGORY_LABELS[s.category as BlogCategory] ?? s.category} schedule? Existing drafts will remain.`,
      )
    ) {
      return
    }
    setRowAction(`delete-${s.id}`)
    try {
      const res = await fetch(`/api/admin/blog-schedules/${s.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Delete failed")
      setMessage({ ok: true, text: "Schedule removed." })
      await load()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Delete failed" })
    } finally {
      setRowAction(null)
    }
  }

  const activeCount = schedules.filter((s) => s.isActive).length

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Auto-blog schedules
        </h2>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          {activeCount} active · /api/cron/blog-autogen runs generateAndSaveDraft when each row's cadence
          elapses. Drafts land in the article list above.
        </span>
      </div>

      {error ? (
        <p className="mb-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </p>
      ) : null}

      {message ? (
        <div
          role="alert"
          className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            message.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {message.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      {/* Add form */}
      <form onSubmit={addSchedule} className="mb-4 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Sport
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              disabled={adding}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {SUPPORTED_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BlogCategory)}
              disabled={adding}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {BLOG_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Every N days
            <input
              type="number"
              value={cadenceDays}
              onChange={(e) => setCadenceDays(Number(e.target.value) || 1)}
              min={1}
              max={90}
              disabled={adding}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>
          <label className="flex items-end gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              disabled={adding}
              className="h-3.5 w-3.5"
            />
            Auto-publish
          </label>
        </div>

        <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Topic hint (optional — steers the generator each run)
          <input
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            disabled={adding}
            placeholder="e.g. sleeper picks, injury fallout, waiver targets"
            maxLength={500}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </label>

        {autoPublish ? (
          <p
            className="rounded border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            <span className="font-semibold text-amber-200">Auto-publish is on.</span> Every generated article
            will go live immediately without review. Leave off for human-in-the-loop.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {adding ? "Creating…" : "Add schedule"}
        </button>
      </form>

      {/* List */}
      {loading && schedules.length === 0 ? (
        <div className="flex items-center justify-center py-6" style={{ color: "var(--muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <p className="flex items-start gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
          No schedules yet. Add one above — the cron won't do anything until a row exists here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Sport / Category</th>
                <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Cadence</th>
                <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Last run</th>
                <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Next run</th>
                <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>State</th>
                <th className="px-3 py-2 text-right" style={{ color: "var(--muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const nextAt = nextRunAt(s)
                return (
                  <tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                      <p className="font-semibold">
                        {s.sport}
                        <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                          · {BLOG_CATEGORY_LABELS[s.category as BlogCategory] ?? s.category}
                        </span>
                      </p>
                      {s.topicHint ? (
                        <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                          {s.topicHint}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--muted)" }}>
                      every {s.cadenceDays}d · {s.runCount} runs
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--muted)" }}>
                      {s.lastRunAt ? (
                        <>
                          {formatRelative(s.lastRunAt)}
                          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            s.lastRunStatus === "ok"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-rose-500/15 text-rose-200"
                          }`}>
                            {s.lastRunStatus ?? "?"}
                          </span>
                          {s.lastRunError ? (
                            <p className="mt-0.5 text-[9px] text-rose-300" title={s.lastRunError}>
                              {s.lastRunError.length > 64 ? s.lastRunError.slice(0, 64) + "…" : s.lastRunError}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        "never"
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--muted)" }}>
                      {nextAt ? formatRelative(nextAt.toISOString()) : "paused"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          s.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.04] text-white/50"
                        }`}
                      >
                        {s.isActive ? "Active" : "Paused"}
                      </span>
                      {s.autoPublish ? (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
                          <Zap className="h-2.5 w-2.5" />
                          Auto-pub
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <ToggleBtn
                          label={s.isActive ? "Pause" : "Resume"}
                          busy={rowAction === `isActive-${s.id}`}
                          onClick={() => updateSchedule(s, { isActive: !s.isActive })}
                          disabled={rowAction != null}
                        />
                        <ToggleBtn
                          label={s.autoPublish ? "Auto-pub off" : "Auto-pub on"}
                          busy={rowAction === `autoPublish-${s.id}`}
                          onClick={() => updateSchedule(s, { autoPublish: !s.autoPublish })}
                          disabled={rowAction != null}
                          accent={s.autoPublish ? "" : "amber"}
                        />
                        <ToggleBtn
                          label="Remove"
                          icon={<Trash2 className="h-3 w-3" />}
                          busy={rowAction === `delete-${s.id}`}
                          onClick={() => removeSchedule(s)}
                          disabled={rowAction != null}
                          accent="rose"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ToggleBtn({
  label,
  icon,
  busy,
  disabled,
  accent,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  busy: boolean
  disabled?: boolean
  accent?: "rose" | "amber" | ""
  onClick: () => void
}) {
  const cls =
    accent === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
      : accent === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
        : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${cls}`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : icon ?? <Power className="h-3 w-3" />}
      {label}
    </button>
  )
}
