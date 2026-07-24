"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * Admin closed-beta invite issuance (P0-1 BETA-GATE).
 *
 * Reuses the existing admin surface, `requireAdmin`-gated API (`/api/admin/beta-invites`),
 * and command-center styling. Security constraints baked into the UI:
 *  - The raw one-time claim URL is shown ONLY in the issuance response, held in component
 *    state (never localStorage / analytics / logs), with a warning that it cannot be
 *    recovered after dismissal. The stored digest is never surfaced.
 *  - The issue button disables while submitting to prevent duplicate invites.
 *
 * Visual: matches the admin Command Center shell (hard dark navy #020817). Text colors are
 * chosen to clear WCAG AA on that background — every body/label/header token composites to
 * >= 4.5:1 (>= 3:1 for large headings), so the panel is readable on mobile and desktop.
 * It renders in BOTH the healthy admin page and the degraded (metrics-failed) page, so a
 * failing unrelated admin loader can never hide the invitation controls.
 */

type InviteStatus = "pending" | "redeemed" | "revoked"

type InviteRow = {
  id: string
  invitedEmail: string
  status: InviteStatus
  note: string | null
  createdByAdmin: string
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  redeemedAt: string | null
  redeemedByUserId: string | null
}

type IssuedInvite = { invitedEmail: string; claimUrl: string; expiresAt: string | null }

type DisplayStatus = "active" | "expired" | "redeemed" | "revoked"

function displayStatus(row: InviteRow): DisplayStatus {
  if (row.status === "redeemed") return "redeemed"
  if (row.status === "revoked") return "revoked"
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return "expired"
  return "active"
}

const STATUS_CHIP: Record<DisplayStatus, string> = {
  active: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  expired: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  redeemed: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  revoked: "border-rose-300/30 bg-rose-300/10 text-rose-100",
}

function formatEt(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return "—"
  }
}

export function BetaInvitePanel() {
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DisplayStatus | "all">("all")

  const [email, setEmail] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [note, setNote] = useState("")
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [lastIssued, setLastIssued] = useState<IssuedInvite | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/beta-invites", { cache: "no-store" })
      if (!res.ok) {
        setError(res.status === 401 || res.status === 403 ? "Not authorized." : `Request failed (${res.status}).`)
        setInvites([])
        return
      }
      const body = (await res.json()) as { invites: InviteRow[] }
      setInvites(body.invites ?? [])
    } catch {
      setError("Network error — invites could not be loaded.")
      setInvites([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const issue = useCallback(async () => {
    if (issuing) return // guard against duplicate submits
    setIssuing(true)
    setIssueError(null)
    setCopied(false)
    try {
      const res = await fetch("/api/admin/beta-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          note: note.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setIssueError(typeof body?.error === "string" ? body.error : `Failed (${res.status}).`)
        return
      }
      setLastIssued({ invitedEmail: body.invitedEmail, claimUrl: body.claimUrl, expiresAt: body.expiresAt ?? null })
      setEmail("")
      setExpiresAt("")
      setNote("")
      await load()
    } catch {
      setIssueError("Network error — the invite was not created.")
    } finally {
      setIssuing(false)
    }
  }, [email, expiresAt, note, issuing, load])

  const revoke = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/beta-invites?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        if (res.ok) await load()
        else setError(`Revoke failed (${res.status}).`)
      } catch {
        setError("Network error — revoke failed.")
      }
    },
    [load],
  )

  const copyUrl = useCallback(async () => {
    if (!lastIssued) return
    try {
      await navigator.clipboard.writeText(lastIssued.claimUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }, [lastIssued])

  const filtered = useMemo(
    () => (filter === "all" ? invites : invites.filter((r) => displayStatus(r) === filter)),
    [invites, filter],
  )

  return (
    <div className="space-y-4">
      {/* ── Issue form ─────────────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void issue()
        }}
        className="rounded-2xl border border-white/10 bg-black/25 p-4"
      >
        <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-100/75">Issue an invitation</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/50">Email (required)</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/50">Expires (optional)</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            />
          </label>
          <button
            type="submit"
            disabled={issuing || !email.trim()}
            className="rounded-xl bg-violet-500/30 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-500/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {issuing ? "Issuing…" : "Issue invite"}
          </button>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] text-white/50">Internal note (optional, non-sensitive)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="wave 1 — reddit"
            maxLength={200}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          />
        </label>
        {issueError && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-300/25 bg-rose-300/[0.07] p-3 text-[13px] text-rose-100">
            {issueError}
          </div>
        )}
      </form>

      {/* ── One-time claim URL (shown once) ────────────────────────────────────────── */}
      {lastIssued && (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
                Invite created for {lastIssued.invitedEmail}
              </div>
              <p className="mt-1 text-[12px] leading-5 text-emerald-100/70">
                Copy this one-time link now — <strong>it cannot be recovered after you dismiss this.</strong> Only the
                invited email can complete signup with it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLastIssued(null)
                setCopied(false)
              }}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:text-white"
              aria-label="Dismiss invite link"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-white/80">
              {lastIssued.claimUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="rounded-lg bg-white/10 px-3 py-2 text-[12px] font-black text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-white/10" role="group" aria-label="Filter invites">
          {(["all", "active", "expired", "redeemed", "revoked"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={filter === s}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                filter === s ? "bg-violet-500/25 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          Refresh
        </button>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────────────── */}
      {loading && <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/50">Loading invitations…</div>}
      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.07] p-4 text-sm text-rose-100">
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/60">
          No invitations {filter === "all" ? "yet" : `with status "${filter}"`}. Issue one above.
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
          <table className="w-full min-w-[720px] text-left text-xs">
            <caption className="sr-only">Closed-beta invitations</caption>
            <thead className="text-[10px] uppercase tracking-[0.16em] text-white/60">
              <tr>
                <th scope="col" className="py-2 pl-4 pr-3">Email</th>
                <th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col" className="py-2 pr-3">Created</th>
                <th scope="col" className="py-2 pr-3">Expires</th>
                <th scope="col" className="py-2 pr-3">Note</th>
                <th scope="col" className="py-2 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((row) => {
                const ds = displayStatus(row)
                return (
                  <tr key={row.id} className="align-top text-white/70">
                    <td className="py-3 pl-4 pr-3 font-black text-white">{row.invitedEmail}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${STATUS_CHIP[ds]}`}>
                        {ds}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[11px] text-white/50">{formatEt(row.createdAt)}</td>
                    <td className="py-3 pr-3 text-[11px] text-white/50">{formatEt(row.expiresAt)}</td>
                    <td className="max-w-[180px] py-3 pr-3 text-[11px] text-white/60">{row.note ?? "—"}</td>
                    <td className="py-3 pr-4 text-right">
                      {ds === "active" ? (
                        <button
                          type="button"
                          onClick={() => void revoke(row.id)}
                          className="rounded-lg border border-rose-300/25 px-2 py-1 text-[11px] font-black text-rose-100 hover:bg-rose-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/55">—</span>
                      )}
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
