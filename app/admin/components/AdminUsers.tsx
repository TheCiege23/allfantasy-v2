"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Search,
  RefreshCw,
  Trash2,
  Users,
  KeyRound,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Mail,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useUserTimezone } from "@/hooks/useUserTimezone"
import { downloadCsv } from "@/lib/admin-dashboard/CsvExport"

interface AppUser {
  id: string
  email: string
  username: string
  emailVerified: boolean
  phoneVerified: boolean
  verificationMethod: string | null
  profileComplete: boolean
  sleeperUsername: string | null
  createdAt: string
}

export default function AdminUsers() {
  const searchParams = useSearchParams()
  const { formatInTimezone } = useUserTimezone()
  const fmtDate = (iso: string) => {
    try {
      return formatInTimezone(iso, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState(searchParams.get("q") || "")
  const [emailStatusFilter, setEmailStatusFilter] = useState<"all" | "verified" | "unverified">("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "email_asc" | "username_asc">("created_desc")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [resetLoading, setResetLoading] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ userId: string; ok: boolean; message: string } | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<AppUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [moderationAction, setModerationAction] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load users")
      setUsers(data?.users || [])
    } catch (e: any) {
      setError(e.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const nextQ = searchParams.get("q") || ""
    setSearchQ((prev) => (prev === nextQ ? prev : nextQ))
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [searchQ, emailStatusFilter, sortBy])

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    let list = !q
      ? users
      : users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.sleeperUsername?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
      )

    if (emailStatusFilter === "verified") list = list.filter((u) => u.emailVerified)
    if (emailStatusFilter === "unverified") list = list.filter((u) => !u.emailVerified)

    const sorted = [...list]
    if (sortBy === "created_asc") sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    if (sortBy === "created_desc") sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sortBy === "email_asc") sorted.sort((a, b) => a.email.localeCompare(b.email))
    if (sortBy === "username_asc") sorted.sort((a, b) => a.username.localeCompare(b.username))
    return sorted
  }, [users, searchQ, emailStatusFilter, sortBy])

  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > maxPage) setPage(maxPage)
  }, [page, maxPage])

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => users.some((u) => u.id === id)))
  }, [users])

  const applyModerationAction = async (userId: string, actionType: "ban" | "suspend") => {
    setModerationAction(`${actionType}-${userId}`)
    try {
      const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(userId)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          reason: actionType === "ban" ? "Admin user management ban" : "Admin user management suspension",
          expiresAt: actionType === "suspend" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Failed to ${actionType}`)
      setDeleteResult({ ok: true, message: actionType === "ban" ? "User banned" : "User suspended for 7 days" })
    } catch (e: any) {
      setDeleteResult({ ok: false, message: e?.message || `Failed to ${actionType}` })
    } finally {
      setModerationAction(null)
    }
  }

  const runBulkModerationAction = async (actionType: "ban" | "suspend") => {
    if (selectedUserIds.length === 0) return
    setBulkLoading(actionType)
    try {
      const results = await Promise.all(
        selectedUserIds.map(async (id) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(id)}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actionType,
              reason: actionType === "ban" ? "Admin bulk ban" : "Admin bulk suspension",
              expiresAt: actionType === "suspend" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            }),
          })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      setDeleteResult({
        ok: okCount > 0,
        message: `${actionType === "ban" ? "Banned" : "Suspended"} ${okCount}/${selectedUserIds.length} selected users`,
      })
      setSelectedUserIds([])
    } catch (e: any) {
      setDeleteResult({ ok: false, message: e?.message || `Bulk ${actionType} failed` })
    } finally {
      setBulkLoading(null)
    }
  }

  const runBulkUndoModerationAction = async (actionType: "unban" | "unmute" | "unsuspend") => {
    if (selectedUserIds.length === 0) return
    setBulkLoading(actionType)
    try {
      const path =
        actionType === "unban"
          ? "ban"
          : actionType === "unmute"
          ? "mute"
          : "suspend"
      const results = await Promise.all(
        selectedUserIds.map(async (id) => {
          const res = await fetch(`/api/admin/moderation/users/${encodeURIComponent(id)}/${path}`, {
            method: "DELETE",
          })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      const actionLabel =
        actionType === "unban"
          ? "Unbanned"
          : actionType === "unmute"
          ? "Unmuted"
          : "Unsuspended"
      setDeleteResult({
        ok: okCount > 0,
        message: `${actionLabel} ${okCount}/${selectedUserIds.length} selected users`,
      })
      setSelectedUserIds([])
    } catch (e: any) {
      setDeleteResult({ ok: false, message: e?.message || `Bulk ${actionType} failed` })
    } finally {
      setBulkLoading(null)
    }
  }

  const runBulkDelete = async () => {
    if (selectedUserIds.length === 0) return
    if (!confirm(`Delete ${selectedUserIds.length} selected users? This cannot be undone.`)) return
    setBulkLoading("delete")
    try {
      const results = await Promise.all(
        selectedUserIds.map(async (id) => {
          const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
          return res.ok
        })
      )
      const okCount = results.filter(Boolean).length
      if (okCount > 0) {
        setUsers((prev) => prev.filter((u) => !selectedUserIds.includes(u.id)))
      }
      setDeleteResult({
        ok: okCount > 0,
        message: `Deleted ${okCount}/${selectedUserIds.length} selected users`,
      })
      setSelectedUserIds([])
    } catch (e: any) {
      setDeleteResult({ ok: false, message: e?.message || "Bulk delete failed" })
    } finally {
      setBulkLoading(null)
    }
  }

  const exportVisibleCsv = () => {
    downloadCsv(
      "admin-users-visible.csv",
      ["id", "email", "username", "emailVerified", "profileComplete", "sleeperUsername", "createdAt"],
      filtered.map((u) => [u.id, u.email, u.username, u.emailVerified, u.profileComplete, u.sleeperUsername ?? "", u.createdAt])
    )
  }

  const exportSelectedCsv = () => {
    const selected = users.filter((u) => selectedUserIds.includes(u.id))
    downloadCsv(
      "admin-users-selected.csv",
      ["id", "email", "username", "emailVerified", "profileComplete", "sleeperUsername", "createdAt"],
      selected.map((u) => [u.id, u.email, u.username, u.emailVerified, u.profileComplete, u.sleeperUsername ?? "", u.createdAt])
    )
  }

  const handleResetPassword = async (user: AppUser) => {
    if (!confirm(`Send a password reset link to ${user.email}?`)) return

    setResetLoading(user.id)
    setResetResult(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to send reset link")
      setResetResult({ userId: user.id, ok: true, message: data.message || "Reset link sent!" })
    } catch (e: any) {
      setResetResult({ userId: user.id, ok: false, message: e.message || "Failed" })
    } finally {
      setResetLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    setDeleteResult(null)
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete user")
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id))
      setDeleteResult({ ok: true, message: data.message || "User deleted" })
      setDeleteConfirm(null)
    } catch (e: any) {
      setDeleteResult({ ok: false, message: e.message || "Failed to delete" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Registered Users
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {users.length} total users
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted2)" }} />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              data-testid="admin-users-search"
              placeholder="Search email or username..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border text-sm outline-none transition"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--text) 5%, transparent)",
                color: "var(--text)",
              }}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            data-testid="admin-users-refresh"
            className="h-10 w-10 flex items-center justify-center rounded-xl border hover:opacity-80 transition"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--muted)" }} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={emailStatusFilter}
          onChange={(e) => {
            setEmailStatusFilter(e.target.value as "all" | "verified" | "unverified")
            setPage(1)
          }}
          data-testid="admin-users-filter-email-status"
          className="h-9 rounded-lg border px-2 text-sm"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
        >
          <option value="all">All users</option>
          <option value="verified">Verified email</option>
          <option value="unverified">Unverified email</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as "created_desc" | "created_asc" | "email_asc" | "username_asc")
            setPage(1)
          }}
          data-testid="admin-users-sort"
          className="h-9 rounded-lg border px-2 text-sm"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
        >
          <option value="created_desc">Newest first</option>
          <option value="created_asc">Oldest first</option>
          <option value="email_asc">Email A-Z</option>
          <option value="username_asc">Username A-Z</option>
        </select>
        <button
          type="button"
          onClick={exportVisibleCsv}
          className="h-9 rounded-lg border px-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-users-export-visible"
        >
          Export visible CSV
        </button>
        <button
          type="button"
          onClick={exportSelectedCsv}
          disabled={selectedUserIds.length === 0}
          className="h-9 rounded-lg border px-3 text-xs disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-users-export-selected"
        >
          Export selected CSV
        </button>
      </div>

      {selectedUserIds.length > 0 && (
        <div
          className="rounded-xl border p-3 flex flex-wrap items-center gap-2"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-users-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedUserIds.length} selected</span>
          <button
            type="button"
            onClick={() => runBulkModerationAction("ban")}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-ban"
          >
            {bulkLoading === "ban" ? "Banning..." : "Ban selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkModerationAction("suspend")}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-suspend"
          >
            {bulkLoading === "suspend" ? "Suspending..." : "Suspend selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUndoModerationAction("unban")}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-unban"
          >
            {bulkLoading === "unban" ? "Unbanning..." : "Unban selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUndoModerationAction("unmute")}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-unmute"
          >
            {bulkLoading === "unmute" ? "Unmuting..." : "Unmute selected"}
          </button>
          <button
            type="button"
            onClick={() => runBulkUndoModerationAction("unsuspend")}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-unsuspend"
          >
            {bulkLoading === "unsuspend" ? "Unsuspending..." : "Unsuspend selected"}
          </button>
          <button
            type="button"
            onClick={runBulkDelete}
            disabled={bulkLoading != null}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "#fda4af" }}
            data-testid="admin-users-bulk-delete"
          >
            {bulkLoading === "delete" ? "Deleting..." : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedUserIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {resetResult && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            resetResult.ok
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {resetResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {resetResult.message}
          </div>
        </div>
      )}

      {deleteResult && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            deleteResult.ok
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {deleteResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {deleteResult.message}
          </div>
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={paged.length > 0 && paged.every((u) => selectedUserIds.includes(u.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next = new Set(selectedUserIds)
                          paged.forEach((u) => next.add(u.id))
                          setSelectedUserIds(Array.from(next))
                        } else {
                          setSelectedUserIds((prev) => prev.filter((id) => !paged.some((u) => u.id === id)))
                        }
                      }}
                      data-testid="admin-users-select-page"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                      {searchQ ? "No users match your search" : "No registered users found"}
                    </td>
                  </tr>
                ) : (
                  paged.map((user) => (
                    <tr
                      key={user.id}
                      data-testid={`admin-users-row-${user.id}`}
                      className="border-t transition hover:bg-white/[0.02]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds((prev) => Array.from(new Set([...prev, user.id])))
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== user.id))
                            }
                          }}
                          data-testid={`admin-users-select-${user.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted2)" }} />
                          <span className="font-medium truncate max-w-[200px]" style={{ color: "var(--text)" }}>
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "var(--muted)" }}>{user.username}</span>
                        {user.sleeperUsername && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Sleeper
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="h-3 w-3" />
                              Unverified
                            </span>
                          )}
                          {user.profileComplete && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Shield className="h-3 w-3" />
                              Complete
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {fmtDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={resetLoading === user.id || !user.email}
                            data-testid={`admin-users-reset-${user.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                            style={{
                              borderColor: "var(--border)",
                              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                              color: "var(--accent)",
                            }}
                            title="Send password reset email"
                          >
                            {resetLoading === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="h-3.5 w-3.5" />
                            )}
                            Reset PW
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(user)
                              setDeleteResult(null)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-red-400 border-red-500/20 bg-red-500/10 transition hover:bg-red-500/20 disabled:opacity-50"
                            title="Delete user"
                            data-testid={`admin-users-delete-${user.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                          <button
                            onClick={() => applyModerationAction(user.id, "ban")}
                            disabled={moderationAction === `ban-${user.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-rose-300 border-rose-500/20 bg-rose-500/10 transition hover:bg-rose-500/20 disabled:opacity-50"
                            data-testid={`admin-users-ban-${user.id}`}
                          >
                            {moderationAction === `ban-${user.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                            Ban
                          </button>
                          <button
                            onClick={() => applyModerationAction(user.id, "suspend")}
                            disabled={moderationAction === `suspend-${user.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-amber-300 border-amber-500/20 bg-amber-500/10 transition hover:bg-amber-500/20 disabled:opacity-50"
                            data-testid={`admin-users-suspend-${user.id}`}
                          >
                            {moderationAction === `suspend-${user.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                            Suspend
                          </button>
                          <Link
                            href={`/admin?tab=users&q=${encodeURIComponent(user.email || user.username || user.id)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                            style={{
                              borderColor: "var(--border)",
                              background: "color-mix(in srgb, var(--text) 6%, transparent)",
                              color: "var(--text)",
                            }}
                            data-testid={`admin-users-view-${user.id}`}
                          >
                            View user
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-page-prev"
            >
              Prev
            </button>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Page {page} / {maxPage}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-page-next"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteConfirm(null)} />
          <div
            className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  Delete User
                </h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {deleteConfirm.email}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Username: {deleteConfirm.username} | Joined: {fmtDate(deleteConfirm.createdAt)}
              </p>
            </div>

            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently delete the user account, profile, and all verification tokens. Are you sure?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
