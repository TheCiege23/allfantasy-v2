"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
import { useUserTimezone } from "@/hooks/useUserTimezone"
import { downloadCsv } from "@/lib/admin-dashboard/CsvExport"

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
type SuspendedUser = { userId: string; email: string | null; username: string | null; suspendedAt: string | null; expiresAt: string | null }

export default function AdminModerationPanel() {
  const { formatInTimezone } = useUserTimezone()
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([])
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([])
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("all")
  const [contentPage, setContentPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)
  const [selectedContentReportIds, setSelectedContentReportIds] = useState<string[]>([])
  const [selectedUserReportIds, setSelectedUserReportIds] = useState<string[]>([])
  const [selectedBannedUserIds, setSelectedBannedUserIds] = useState<string[]>([])
  const [selectedMutedUserIds, setSelectedMutedUserIds] = useState<string[]>([])
  const [selectedSuspendedUserIds, setSelectedSuspendedUserIds] = useState<string[]>([])
  const [bulkActioning, setBulkActioning] = useState<string | null>(null)
  const PAGE_SIZE = 10

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [modRes, bannedRes, mutedRes, suspendedRes] = await Promise.all([
        fetch("/api/admin/dashboard/moderation?limit=50", { cache: "no-store" }),
        fetch("/api/admin/moderation/users/banned", { cache: "no-store" }),
        fetch("/api/admin/moderation/users/muted", { cache: "no-store" }),
        fetch("/api/admin/moderation/users/suspended", { cache: "no-store" }),
      ])
      const modJson = await modRes.json().catch(() => ({}))
      const bannedJson = await bannedRes.json().catch(() => ({}))
      const mutedJson = await mutedRes.json().catch(() => ({}))
      const suspendedJson = await suspendedRes.json().catch(() => ({}))
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
      if (suspendedRes.ok && Array.isArray(suspendedJson.suspended)) {
        setSuspendedUsers(
          suspendedJson.suspended.map((m: { userId: string; email?: string | null; username?: string | null; suspendedAt?: string | null; expiresAt?: string | null }) => ({
            userId: m.userId,
            email: m.email ?? null,
            username: m.username ?? null,
            suspendedAt: m.suspendedAt ?? null,
            expiresAt: m.expiresAt ?? null,
          }))
        )
      } else {
        setSuspendedUsers([])
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

  const applySuspendAction = async (userId: string) => {
    setActioning(`action-${userId}-suspend`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "suspend",
          reason: "Admin suspension",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || "Failed to suspend")
        return
      }
      toast.success("User suspended")
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

  const unsuspendUser = async (userId: string) => {
    setActioning(`unsuspend-${userId}`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/suspend`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || "Failed to unsuspend")
        return
      }
      toast.success("User unsuspended")
      await load()
    } catch {
      toast.error("Request failed")
    } finally {
      setActioning(null)
    }
  }

  const fmtDate = (iso: string) => {
    try {
      return formatInTimezone(iso, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  const filteredReportedContent = useMemo(() => {
    if (reportStatusFilter === "all") return reportedContent
    return reportedContent.filter((r) => r.status === reportStatusFilter)
  }, [reportedContent, reportStatusFilter])

  const filteredReportedUsers = useMemo(() => {
    if (reportStatusFilter === "all") return reportedUsers
    return reportedUsers.filter((r) => r.status === reportStatusFilter)
  }, [reportedUsers, reportStatusFilter])

  const maxContentPage = Math.max(1, Math.ceil(filteredReportedContent.length / PAGE_SIZE))
  const maxUsersPage = Math.max(1, Math.ceil(filteredReportedUsers.length / PAGE_SIZE))
  const pagedReportedContent = filteredReportedContent.slice((contentPage - 1) * PAGE_SIZE, contentPage * PAGE_SIZE)
  const pagedReportedUsers = filteredReportedUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE)

  useEffect(() => {
    if (contentPage > maxContentPage) setContentPage(maxContentPage)
  }, [contentPage, maxContentPage])

  useEffect(() => {
    if (usersPage > maxUsersPage) setUsersPage(maxUsersPage)
  }, [usersPage, maxUsersPage])

  useEffect(() => {
    setSelectedContentReportIds((prev) => prev.filter((id) => filteredReportedContent.some((r) => r.id === id)))
  }, [filteredReportedContent])

  useEffect(() => {
    setSelectedUserReportIds((prev) => prev.filter((id) => filteredReportedUsers.some((r) => r.id === id)))
  }, [filteredReportedUsers])

  useEffect(() => {
    setSelectedBannedUserIds((prev) => prev.filter((id) => bannedUsers.some((u) => u.userId === id)))
  }, [bannedUsers])

  useEffect(() => {
    setSelectedMutedUserIds((prev) => prev.filter((id) => mutedUsers.some((u) => u.userId === id)))
  }, [mutedUsers])

  useEffect(() => {
    setSelectedSuspendedUserIds((prev) => prev.filter((id) => suspendedUsers.some((u) => u.userId === id)))
  }, [suspendedUsers])

  const runBulkReportStatus = async (type: "message" | "user", status: "resolved" | "dismissed") => {
    const selectedIds = type === "message" ? selectedContentReportIds : selectedUserReportIds
    if (selectedIds.length === 0) return
    setBulkActioning(`${type}-${status}`)
    try {
      const results = await Promise.all(
        selectedIds.map(async (reportId) => {
          const res = await fetch(`/api/admin/moderation/reports/${type}/${reportId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      toast.success(`${status} ${okCount}/${selectedIds.length} ${type === "message" ? "message" : "user"} reports`)
      if (type === "message") setSelectedContentReportIds([])
      else setSelectedUserReportIds([])
      await load()
    } catch {
      toast.error("Bulk update failed")
    } finally {
      setBulkActioning(null)
    }
  }

  const runBulkUserAction = async (actionType: "ban" | "mute" | "suspend") => {
    if (selectedUserReportIds.length === 0) return
    setBulkActioning(`users-${actionType}`)
    try {
      const selectedReports = reportedUsers.filter((r) => selectedUserReportIds.includes(r.id))
      const uniqueUserIds = Array.from(new Set(selectedReports.map((r) => r.reportedUserId)))
      const results = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actionType,
              reason: `Admin bulk ${actionType}`,
              expiresAt: actionType === "suspend" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            }),
          })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      toast.success(`${actionType} applied to ${okCount}/${uniqueUserIds.length} users`)
      setSelectedUserReportIds([])
      await load()
    } catch {
      toast.error(`Bulk ${actionType} failed`)
    } finally {
      setBulkActioning(null)
    }
  }

  const exportModerationCsv = () => {
    downloadCsv(
      "admin-moderation-reports.csv",
      ["type", "id", "entityId", "reporterUserId", "reason", "status", "createdAt"],
      [
        ...filteredReportedContent.map((r) => ["content", r.id, r.messageId, r.reporterUserId, r.reason, r.status, r.createdAt]),
        ...filteredReportedUsers.map((r) => ["user", r.id, r.reportedUserId, r.reporterUserId, r.reason, r.status, r.createdAt]),
      ]
    )
  }

  const exportActionsCsv = () => {
    downloadCsv(
      "admin-moderation-actions.csv",
      ["type", "userId", "email", "username", "createdAt", "expiresAt"],
      [
        ...bannedUsers.map((u) => ["ban", u.userId, u.email ?? "", u.username ?? "", u.bannedAt ?? "", ""]),
        ...mutedUsers.map((u) => ["mute", u.userId, u.email ?? "", u.username ?? "", u.mutedAt ?? "", u.expiresAt ?? ""]),
        ...suspendedUsers.map((u) => ["suspend", u.userId, u.email ?? "", u.username ?? "", u.suspendedAt ?? "", u.expiresAt ?? ""]),
      ]
    )
  }

  const runBulkUnban = async () => {
    if (selectedBannedUserIds.length === 0) return
    setBulkActioning("bulk-unban")
    try {
      const results = await Promise.all(
        selectedBannedUserIds.map(async (userId) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/ban`, { method: "DELETE" })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      toast.success(`Unbanned ${okCount}/${selectedBannedUserIds.length} users`)
      setSelectedBannedUserIds([])
      await load()
    } catch {
      toast.error("Bulk unban failed")
    } finally {
      setBulkActioning(null)
    }
  }

  const runBulkUnmute = async () => {
    if (selectedMutedUserIds.length === 0) return
    setBulkActioning("bulk-unmute")
    try {
      const results = await Promise.all(
        selectedMutedUserIds.map(async (userId) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/mute`, { method: "DELETE" })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      toast.success(`Unmuted ${okCount}/${selectedMutedUserIds.length} users`)
      setSelectedMutedUserIds([])
      await load()
    } catch {
      toast.error("Bulk unmute failed")
    } finally {
      setBulkActioning(null)
    }
  }

  const runBulkUnsuspend = async () => {
    if (selectedSuspendedUserIds.length === 0) return
    setBulkActioning("bulk-unsuspend")
    try {
      const results = await Promise.all(
        selectedSuspendedUserIds.map(async (userId) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/suspend`, { method: "DELETE" })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      toast.success(`Unsuspended ${okCount}/${selectedSuspendedUserIds.length} users`)
      setSelectedSuspendedUserIds([])
      await load()
    } catch {
      toast.error("Bulk unsuspend failed")
    } finally {
      setBulkActioning(null)
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
          data-testid="admin-moderation-refresh"
          className="h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs" style={{ color: "var(--muted)" }}>Report status</label>
        <select
          value={reportStatusFilter}
          onChange={(e) => {
            setReportStatusFilter(e.target.value as "all" | "pending" | "resolved" | "dismissed")
            setContentPage(1)
            setUsersPage(1)
          }}
          data-testid="admin-moderation-status-filter"
          className="h-9 rounded-lg border px-2 text-sm"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <button
          type="button"
          onClick={exportModerationCsv}
          className="h-9 rounded-lg border px-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-moderation-export-visible"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={exportActionsCsv}
          className="h-9 rounded-lg border px-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-moderation-export-actions"
        >
          Export actions CSV
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {selectedContentReportIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-moderation-content-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedContentReportIds.length} content reports selected</span>
          <button
            type="button"
            onClick={() => runBulkReportStatus("message", "resolved")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-content-bulk-resolve"
          >
            {bulkActioning === "message-resolved" ? "Resolving..." : "Resolve selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkReportStatus("message", "dismissed")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-content-bulk-dismiss"
          >
            {bulkActioning === "message-dismissed" ? "Dismissing..." : "Dismiss selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedContentReportIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-content-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {selectedUserReportIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-moderation-users-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedUserReportIds.length} user reports selected</span>
          <button
            type="button"
            onClick={() => runBulkReportStatus("user", "resolved")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-users-bulk-resolve"
          >
            {bulkActioning === "user-resolved" ? "Resolving..." : "Resolve selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkReportStatus("user", "dismissed")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-users-bulk-dismiss"
          >
            {bulkActioning === "user-dismissed" ? "Dismissing..." : "Dismiss selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUserAction("ban")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "#fda4af" }}
            data-testid="admin-moderation-users-bulk-ban"
          >
            {bulkActioning === "users-ban" ? "Banning..." : "Ban users"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUserAction("mute")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "#fcd34d" }}
            data-testid="admin-moderation-users-bulk-mute"
          >
            {bulkActioning === "users-mute" ? "Muting..." : "Mute users"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUserAction("suspend")}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "#d8b4fe" }}
            data-testid="admin-moderation-users-bulk-suspend"
          >
            {bulkActioning === "users-suspend" ? "Suspending..." : "Suspend users"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedUserReportIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-users-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {selectedBannedUserIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-moderation-banned-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedBannedUserIds.length} banned users selected</span>
          <button
            type="button"
            onClick={runBulkUnban}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-banned-bulk-unban"
          >
            {bulkActioning === "bulk-unban" ? "Unbanning..." : "Unban selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedBannedUserIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-banned-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {selectedMutedUserIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-moderation-muted-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedMutedUserIds.length} muted users selected</span>
          <button
            type="button"
            onClick={runBulkUnmute}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-muted-bulk-unmute"
          >
            {bulkActioning === "bulk-unmute" ? "Unmuting..." : "Unmute selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedMutedUserIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-muted-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {selectedSuspendedUserIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-moderation-suspended-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedSuspendedUserIds.length} suspended users selected</span>
          <button
            type="button"
            onClick={runBulkUnsuspend}
            disabled={bulkActioning != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-suspended-bulk-unsuspend"
          >
            {bulkActioning === "bulk-unsuspend" ? "Unsuspending..." : "Unsuspend selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSuspendedUserIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-moderation-suspended-bulk-clear"
          >
            Clear
          </button>
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
            ({filteredReportedContent.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredReportedContent.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No reported content
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={pagedReportedContent.length > 0 && pagedReportedContent.every((r) => selectedContentReportIds.includes(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next = new Set(selectedContentReportIds)
                          pagedReportedContent.forEach((r) => next.add(r.id))
                          setSelectedContentReportIds(Array.from(next))
                        } else {
                          setSelectedContentReportIds((prev) => prev.filter((id) => !pagedReportedContent.some((r) => r.id === id)))
                        }
                      }}
                      data-testid="admin-moderation-content-select-page"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Thread / Message</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Date</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedReportedContent.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedContentReportIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedContentReportIds((prev) => Array.from(new Set([...prev, r.id])))
                          else setSelectedContentReportIds((prev) => prev.filter((id) => id !== r.id))
                        }}
                        data-testid={`admin-moderation-content-select-${r.id}`}
                      />
                    </td>
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
                              data-testid={`admin-moderation-resolve-message-${r.id}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {actioning === `message-${r.id}-resolved` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Resolve
                            </button>
                            <button
                              onClick={() => updateReportStatus("message", r.id, "dismissed")}
                              disabled={!!actioning}
                              data-testid={`admin-moderation-dismiss-message-${r.id}`}
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
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setContentPage((p) => Math.max(1, p - 1))}
            disabled={contentPage <= 1}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Prev
          </button>
          <span className="text-xs" style={{ color: "var(--muted)" }}>Page {contentPage} / {maxContentPage}</span>
          <button
            type="button"
            onClick={() => setContentPage((p) => Math.min(maxContentPage, p + 1))}
            disabled={contentPage >= maxContentPage}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Next
          </button>
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
            ({filteredReportedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredReportedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No reported users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={pagedReportedUsers.length > 0 && pagedReportedUsers.every((r) => selectedUserReportIds.includes(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next = new Set(selectedUserReportIds)
                          pagedReportedUsers.forEach((r) => next.add(r.id))
                          setSelectedUserReportIds(Array.from(next))
                        } else {
                          setSelectedUserReportIds((prev) => prev.filter((id) => !pagedReportedUsers.some((r) => r.id === id)))
                        }
                      }}
                      data-testid="admin-moderation-users-select-page"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reported user</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedReportedUsers.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedUserReportIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUserReportIds((prev) => Array.from(new Set([...prev, r.id])))
                          else setSelectedUserReportIds((prev) => prev.filter((id) => id !== r.id))
                        }}
                        data-testid={`admin-moderation-users-select-${r.id}`}
                      />
                    </td>
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
                              data-testid={`admin-moderation-resolve-user-${r.id}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {actioning === `user-${r.id}-resolved` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Resolve
                            </button>
                            <button
                              onClick={() => updateReportStatus("user", r.id, "dismissed")}
                              disabled={!!actioning}
                              data-testid={`admin-moderation-dismiss-user-${r.id}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50"
                            >
                              {actioning === `user-${r.id}-dismissed` ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Dismiss
                            </button>
                            <button
                              onClick={() => applyUserAction(r.reportedUserId, "ban")}
                              disabled={!!actioning}
                              data-testid={`admin-moderation-ban-user-${r.reportedUserId}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {actioning === `action-${r.reportedUserId}-ban` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              Ban
                            </button>
                            <button
                              onClick={() => applyUserAction(r.reportedUserId, "mute")}
                              disabled={!!actioning}
                              data-testid={`admin-moderation-mute-user-${r.reportedUserId}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
                            >
                              {actioning === `action-${r.reportedUserId}-mute` ? <Loader2 className="h-3 w-3 animate-spin" /> : <MicOff className="h-3 w-3" />}
                              Mute
                            </button>
                          </>
                        )}
                            <button
                              onClick={() => applySuspendAction(r.reportedUserId)}
                              disabled={!!actioning}
                              data-testid={`admin-moderation-suspend-user-${r.reportedUserId}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                            >
                              {actioning === `action-${r.reportedUserId}-suspend` ? <Loader2 className="h-3 w-3 animate-spin" /> : <MicOff className="h-3 w-3" />}
                              Suspend
                            </button>
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
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
            disabled={usersPage <= 1}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Prev
          </button>
          <span className="text-xs" style={{ color: "var(--muted)" }}>Page {usersPage} / {maxUsersPage}</span>
          <button
            type="button"
            onClick={() => setUsersPage((p) => Math.min(maxUsersPage, p + 1))}
            disabled={usersPage >= maxUsersPage}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Next
          </button>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={bannedUsers.length > 0 && bannedUsers.every((u) => selectedBannedUserIds.includes(u.userId))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedBannedUserIds(bannedUsers.map((u) => u.userId))
                        else setSelectedBannedUserIds([])
                      }}
                      data-testid="admin-moderation-banned-select-all"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Banned at</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bannedUsers.map((b) => (
                  <tr key={b.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedBannedUserIds.includes(b.userId)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBannedUserIds((prev) => Array.from(new Set([...prev, b.userId])))
                          else setSelectedBannedUserIds((prev) => prev.filter((id) => id !== b.userId))
                        }}
                        data-testid={`admin-moderation-banned-select-${b.userId}`}
                      />
                    </td>
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
                        data-testid={`admin-moderation-unban-user-${b.userId}`}
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

      {/* Suspended users */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <MicOff className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Suspended users
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({suspendedUsers.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          {suspendedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No suspended users
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={suspendedUsers.length > 0 && suspendedUsers.every((u) => selectedSuspendedUserIds.includes(u.userId))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSuspendedUserIds(suspendedUsers.map((u) => u.userId))
                        else setSelectedSuspendedUserIds([])
                      }}
                      data-testid="admin-moderation-suspended-select-all"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Suspended at</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suspendedUsers.map((m) => (
                  <tr key={m.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedSuspendedUserIds.includes(m.userId)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSuspendedUserIds((prev) => Array.from(new Set([...prev, m.userId])))
                          else setSelectedSuspendedUserIds((prev) => prev.filter((id) => id !== m.userId))
                        }}
                        data-testid={`admin-moderation-suspended-select-${m.userId}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {m.email ?? m.username ?? m.userId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>{m.suspendedAt ? fmtDate(m.suspendedAt) : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => unsuspendUser(m.userId)}
                        disabled={!!actioning}
                        data-testid={`admin-moderation-unsuspend-user-${m.userId}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {actioning === `unsuspend-${m.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Unsuspend"}
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
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={mutedUsers.length > 0 && mutedUsers.every((u) => selectedMutedUserIds.includes(u.userId))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMutedUserIds(mutedUsers.map((u) => u.userId))
                        else setSelectedMutedUserIds([])
                      }}
                      data-testid="admin-moderation-muted-select-all"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase hidden sm:table-cell" style={{ color: "var(--muted)" }}>Muted at</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mutedUsers.map((m) => (
                  <tr key={m.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedMutedUserIds.includes(m.userId)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMutedUserIds((prev) => Array.from(new Set([...prev, m.userId])))
                          else setSelectedMutedUserIds((prev) => prev.filter((id) => id !== m.userId))
                        }}
                        data-testid={`admin-moderation-muted-select-${m.userId}`}
                      />
                    </td>
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
                        data-testid={`admin-moderation-unmute-user-${m.userId}`}
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
