"use client"

import { useEffect, useState } from "react"
import { Loader2, X, CheckCircle, XCircle, Trash2, Shield } from "lucide-react"

const TIERS = ["pro", "supreme", "commissioner", "war_room"] as const
const DURATIONS = [
  { days: 5, label: "5 days" },
  { days: 10, label: "10 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 365, label: "1 year" },
] as const

type Tier = (typeof TIERS)[number]

type Grant = {
  id: string
  tier: string
  startsAt: string
  expiresAt: string
  grantedByEmail: string
  reason: string | null
  revokedAt: string | null
  revokedReason: string | null
  createdAt: string
}

export function GrantSubscriptionDialog({
  user,
  onClose,
}: {
  user: { id: string; email: string; username: string } | null
  onClose: () => void
}) {
  const [tier, setTier] = useState<Tier>("pro")
  const [durationDays, setDurationDays] = useState<number>(30)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [grants, setGrants] = useState<Grant[]>([])
  const [loadingGrants, setLoadingGrants] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setMessage(null)
    setTier("pro")
    setDurationDays(30)
    setReason("")
    void loadGrants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadGrants() {
    if (!user) return
    setLoadingGrants(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/grant-subscription`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setGrants(data.grants ?? [])
      } else {
        setGrants([])
      }
    } catch {
      setGrants([])
    } finally {
      setLoadingGrants(false)
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/grant-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, durationDays, reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMessage({ ok: true, text: `Granted ${tier} for ${durationDays} day${durationDays === 1 ? "" : "s"}.` })
        setReason("")
        await loadGrants()
      } else {
        setMessage({ ok: false, text: data?.error || "Grant failed" })
      }
    } catch {
      setMessage({ ok: false, text: "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(grantId: string) {
    if (!user) return
    const promptReason = window.prompt("Revoke reason (optional)") ?? ""
    setRevokingId(grantId)
    try {
      const res = await fetch(
        `/api/admin/users/${user.id}/grants/${grantId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: promptReason.trim() || undefined }),
        },
      )
      const data = await res.json()
      if (res.ok && data.ok) {
        await loadGrants()
      } else {
        setMessage({ ok: false, text: data?.error || "Revoke failed" })
      }
    } catch {
      setMessage({ ok: false, text: "Network error." })
    } finally {
      setRevokingId(null)
    }
  }

  if (!user) return null

  const now = Date.now()
  const activeGrants = grants.filter((g) => !g.revokedAt && new Date(g.expiresAt).getTime() > now)
  const inactiveGrants = grants.filter(
    (g) => g.revokedAt || new Date(g.expiresAt).getTime() <= now,
  )

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-violet-400">
              <Shield className="h-3.5 w-3.5" /> Grant subscription
            </div>
            <p className="mt-1 truncate text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {user.email}
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              {user.username} · <span className="font-mono">{user.id}</span>
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
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Tier
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
                disabled={submitting}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Duration
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                disabled={submitting}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {DURATIONS.map((d) => (
                  <option key={d.days} value={d.days}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="Comp, support credit, trial extension…"
              rows={2}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-400 hover:to-purple-500 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Granting…
              </>
            ) : (
              `Grant ${tier.replace("_", " ")} for ${durationDays} day${durationDays === 1 ? "" : "s"}`
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

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Active grants {activeGrants.length > 0 ? `(${activeGrants.length})` : ""}
          </p>
          {loadingGrants ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : activeGrants.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              No active grants.
            </p>
          ) : (
            <ul className="space-y-2">
              {activeGrants.map((g) => (
                <li
                  key={g.id}
                  className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
                >
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold" style={{ color: "var(--text)" }}>
                      {g.tier.replace("_", " ")}
                      <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                        · expires {new Date(g.expiresAt).toLocaleString()}
                      </span>
                    </p>
                    <p style={{ color: "var(--muted)" }}>
                      Granted by {g.grantedByEmail}
                      {g.reason ? ` · ${g.reason}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(g.id)}
                    disabled={revokingId === g.id}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                  >
                    {revokingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {inactiveGrants.length > 0 ? (
          <details className="mt-4">
            <summary
              className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              History ({inactiveGrants.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
              {inactiveGrants.map((g) => (
                <li key={g.id} className="rounded border px-2 py-1" style={{ borderColor: "var(--border)" }}>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {g.tier.replace("_", " ")}
                  </span>
                  {" · "}
                  {g.revokedAt
                    ? `revoked ${new Date(g.revokedAt).toLocaleDateString()}`
                    : `expired ${new Date(g.expiresAt).toLocaleDateString()}`}
                  {g.revokedReason ? ` · ${g.revokedReason}` : g.reason ? ` · ${g.reason}` : ""}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  )
}
