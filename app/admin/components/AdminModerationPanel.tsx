"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Flag,
  RefreshCw,
  MessageSquare,
  UserX,
  Users,
  Loader2,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Ban,
  MicOff,
} from "lucide-react"
import { toast } from "sonner"

type ReportedContent = {
  id: string
  messageId: string
  threadId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: string
}
type ReportedUser = {
  id: string
  reportedUserId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: string
  reportedEmail?: string
  reportedUsername?: string
}
type BlockedUser = {
  id: string
  blockerUserId: string
  blockedUserId: string
  createdAt: string
  blockedEmail?: string
  blockedUsername?: string
}
type BannedUser = { userId: string; email: string | null; username: string | null; bannedAt: string | null }
type MutedUser = { userId: string; email: string | null; username: string | null; mutedAt: string | null; expiresAt: string | null }

export default function AdminModerationPanel() {
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([])
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [modRes, bannedRes, mutedRes] = await Promise.all([
        fetch("/api/admin/dashboard/moderation?limit=50", { cache: "no-store" }),
        fetch("/api/admin/moderation/users/banned", { cache: "no-store" }),
        fetch("/api/admin/moderation/users/muted", { cache: "no-store" }),
      ])
      const modJson = await modRes.json().catch(() => ({}))
      const bannedJson = await bannedRes.json().catch(() => ({}))
      const mutedJson = await mutedRes.json().catch(() => ({}))
      if (!modRes.ok) throw new Error(modJson?.error || "Failed to load moderation data")
      setReportedContent(modJson.reportedContent || [])
      setReportedUsers(modJson.reportedUsers || [])
      setBlockedUsers(modJson.blockedUsers || [])
      if (bannedRes.ok && Array.isArray(bannedJson.banned)) {
        setBannedUsers(
          bannedJson.banned.map((b: { userId: string; email?: string | null; username?: string | null; bannedAt?: string | null }) => ({
            userId: b.userId,
            email: b.email ?? null,
            username: b.username ?? null,
            bannedAt: b.bannedAt ?? null,
          }))
        )
      } else {
        setBannedUsers([])
      }
      if (mutedRes.ok && Array.isArray(mutedJson.muted)) {
        setMutedUsers(
          mutedJson.muted.map((m: { userId: string; email?: string | null; username?: string | null; mutedAt?: string | null; expiresAt?: string | null }) => ({
            userId: m.userId,
            email: m.email ?? null,
            username: m.username ?? null,
            mutedAt: m.mutedAt ?? null,
            expiresAt: m.expiresAt ?? null,
          }))
        )
      } else {
        setMutedUsers([])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateReportStatus = async (type: "message" | "user", reportId: string, status: string) => {
    const key = `${type}-${reportId}-${status}`
    setActioning(key)
    try {
      const res = await fetch(`/api/admin/moderation/reports/${type}/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || "Failed to update report")
        return
      }
      toast.success(`Report ${status}`)
      await load()
    } catch {
      toast.error("Request failed")
    } finally {
      setActioning(null)
    }
  }

  const applyUserAction = async (userId: string, actionType: "ban" | "mute") => {
    setActioning(`action-${userId}-${actionType}`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, reason: "Admin moderation" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || `Failed to ${actionType}`)
        return
      }
      toast.success(actionType === "ban" ? "User banned" : "User muted")
      await load()
    } catch {
      toast.error("Request failed")
    } finally {
      setActioning(null)
    }
  }

  const unbanUser = async (userId: string) => {
    setActioning(`unban-${userId}`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/ban`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || "Failed to unban")
        return
      }
      toast.success("User unbanned")
      await load()
    } catch {
      toast.error("Request failed")
    } finally {
      setActioning(null)
    }
  }

  const unmuteUser = async (userId: string) => {
    setActioning(`unmute-${userId}`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/mute`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || "Failed to unmute")
        return
      }
      toast.success("User unmuted")
      await load()
    } catch {
      toast.error("Request failed")
    } finally {
      setActioning(null)
    }
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Moderation
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Report queue, actions (resolve, dismiss, ban, mute), banned users
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Reported content */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <MessageSquare className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Reported content
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({reportedContent.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {reportedContent.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No reported content
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Thread / Message</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Date</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportedContent.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/messages?thread=${r.threadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        {r.threadId.slice(0, 8)}… / {r.messageId.slice(0, 8)}…
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-2 max-w-[200px] truncate" style={{ color: "var(--muted)" }} title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "color-mix(in srgb, var(--text) 10%, transparent)", color: "var(--muted)" }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateReportStatus("message", r.id, "resolved")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {actioning === `message-${r.id}-resolved` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Resolve
                            </button>
                            <button
                              onClick={() => updateReportStatus("message", r.id, "dismissed")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50"
                            >
                              {actioning === `message-${r.id}-dismissed` ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Dismiss
                            </button>
                          </>
                        )}
                        <Link href={`/messages?thread=${r.threadId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-cyan-400 hover:underline">
                          View conversation
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Reported users */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <Users className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Reported users
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({reportedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {reportedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No reported users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reported user</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportedUsers.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {r.reportedEmail ?? r.reportedUsername ?? r.reportedUserId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-[200px] truncate" style={{ color: "var(--muted)" }} title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "color-mix(in srgb, var(--text) 10%, transparent)", color: "var(--muted)" }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateReportStatus("user", r.id, "resolved")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {actioning === `user-${r.id}-resolved` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Resolve
                            </button>
                            <button
                              onClick={() => updateReportStatus("user", r.id, "dismissed")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50"
                            >
                              {actioning === `user-${r.id}-dismissed` ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Dismiss
                            </button>
                            <button
                              onClick={() => applyUserAction(r.reportedUserId, "ban")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {actioning === `action-${r.reportedUserId}-ban` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              Ban
                            </button>
                            <button
                              onClick={() => applyUserAction(r.reportedUserId, "mute")}
                              disabled={!!actioning}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
                            >
                              {actioning === `action-${r.reportedUserId}-mute` ? <Loader2 className="h-3 w-3 animate-spin" /> : <MicOff className="h-3 w-3" />}
                              Mute
                            </button>
                          </>
                        )}
                        <Link href="/admin?tab=users" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:underline">
                          View user
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Banned users */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <Ban className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Banned users
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({bannedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {bannedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No banned users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Banned at</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bannedUsers.map((b) => (
                  <tr key={b.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {b.email ?? b.username ?? b.userId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>{b.bannedAt ? fmtDate(b.bannedAt) : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => unbanUser(b.userId)}
                        disabled={!!actioning}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {actioning === `unban-${b.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Unban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Muted users */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <MicOff className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Muted users
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({mutedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {mutedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No muted users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Muted at</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mutedUsers.map((m) => (
                  <tr key={m.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {m.email ?? m.username ?? m.userId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>{m.mutedAt ? fmtDate(m.mutedAt) : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => unmuteUser(m.userId)}
                        disabled={!!actioning}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {actioning === `unmute-${m.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Unmute"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Blocked users */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <UserX className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Blocked users (user-to-user)
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({blockedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {blockedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No blocked users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Blocked user</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {b.blockedEmail ?? b.blockedUsername ?? b.blockedUserId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>{fmtDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
