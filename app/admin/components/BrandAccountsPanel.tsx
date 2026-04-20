"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  PlugZap,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Power,
} from "lucide-react"
import {
  BRAND_PLATFORMS,
  PLATFORM_LABELS,
  type BrandPlatform,
} from "@/lib/brand-social/types"

type Account = {
  id: string
  platform: string
  handle: string
  displayName: string | null
  isActive: boolean
  connectedByEmail?: string
  notes: string | null
  createdAt: string
}

type XCreds = {
  authType: "oauth2" | "oauth1"
  accessToken: string
  accessTokenSecret?: string
  consumerKey?: string
  consumerSecret?: string
}

/**
 * AdminBrandPosts subpanel — manage connected brand accounts (add/remove/toggle).
 * Credentials live on the server AES-256-GCM encrypted; this UI never reads them back.
 */
export function BrandAccountsPanel({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [rowAction, setRowAction] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [platform, setPlatform] = useState<BrandPlatform>("x")
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [authType, setAuthType] = useState<"oauth2" | "oauth1">("oauth1")
  const [accessToken, setAccessToken] = useState("")
  const [accessTokenSecret, setAccessTokenSecret] = useState("")
  const [consumerKey, setConsumerKey] = useState("")
  const [consumerSecret, setConsumerSecret] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/brand-posts/accounts", { cache: "no-store" })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAccounts(data.accounts ?? [])
      } else {
        throw new Error(data?.error || "Failed to load accounts")
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load accounts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    setHandle("")
    setDisplayName("")
    setNotes("")
    setAccessToken("")
    setAccessTokenSecret("")
    setConsumerKey("")
    setConsumerSecret("")
  }

  async function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    if (!handle.trim()) {
      setMessage({ ok: false, text: "Handle required." })
      return
    }
    if (platform === "x") {
      if (authType === "oauth2" && !accessToken.trim()) {
        setMessage({ ok: false, text: "OAuth 2.0 requires accessToken." })
        return
      }
      if (
        authType === "oauth1" &&
        (!consumerKey.trim() ||
          !consumerSecret.trim() ||
          !accessToken.trim() ||
          !accessTokenSecret.trim())
      ) {
        setMessage({ ok: false, text: "OAuth 1.0a requires all 4 keys." })
        return
      }
    }

    const credentials: Partial<XCreds> =
      platform === "x"
        ? authType === "oauth2"
          ? { authType: "oauth2", accessToken: accessToken.trim() }
          : {
              authType: "oauth1",
              consumerKey: consumerKey.trim(),
              consumerSecret: consumerSecret.trim(),
              accessToken: accessToken.trim(),
              accessTokenSecret: accessTokenSecret.trim(),
            }
        : {}

    setAdding(true)
    try {
      const res = await fetch("/api/admin/brand-posts/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: handle.trim().replace(/^@/, ""),
          displayName: displayName.trim() || undefined,
          notes: notes.trim() || undefined,
          credentials,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to add account")
      setMessage({ ok: true, text: `Connected @${handle.trim().replace(/^@/, "")}` })
      resetForm()
      await load()
      onChanged?.()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Failed to add account" })
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(a: Account) {
    setRowAction(`toggle-${a.id}`)
    try {
      const res = await fetch(`/api/admin/brand-posts/accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Update failed")
      await load()
      onChanged?.()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Update failed" })
    } finally {
      setRowAction(null)
    }
  }

  async function removeAccount(a: Account) {
    if (
      !window.confirm(
        `Remove @${a.handle} (${PLATFORM_LABELS[a.platform as BrandPlatform] ?? a.platform})? All associated posts will be cascade-deleted.`,
      )
    ) {
      return
    }
    setRowAction(`delete-${a.id}`)
    try {
      const res = await fetch(`/api/admin/brand-posts/accounts/${a.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Delete failed")
      setMessage({ ok: true, text: `Removed @${a.handle}.` })
      await load()
      onChanged?.()
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Delete failed" })
    } finally {
      setRowAction(null)
    }
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <PlugZap className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Brand accounts
        </h2>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          Credentials are AES-256-GCM encrypted · set <code className="font-mono">BRAND_SOCIAL_ENCRYPTION_KEY</code> on the server
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
      <form onSubmit={addAccount} className="mb-4 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as BrandPlatform)}
              disabled={adding}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {BRAND_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide sm:col-span-2" style={{ color: "var(--muted)" }}>
            Handle (without @)
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={adding}
              placeholder="allfantasy"
              maxLength={128}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={adding}
              placeholder="AllFantasy"
              maxLength={128}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>
        </div>

        {platform === "x" ? (
          <>
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={authType === "oauth1"}
                  onChange={() => setAuthType("oauth1")}
                  disabled={adding}
                />
                OAuth 1.0a (long-lived)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={authType === "oauth2"}
                  onChange={() => setAuthType("oauth2")}
                  disabled={adding}
                />
                OAuth 2.0 bearer (2h expiry)
              </label>
            </div>

            {authType === "oauth1" ? (
              <div className="grid grid-cols-2 gap-2">
                <SecretInput label="Consumer key" value={consumerKey} onChange={setConsumerKey} disabled={adding} />
                <SecretInput label="Consumer secret" value={consumerSecret} onChange={setConsumerSecret} disabled={adding} />
                <SecretInput label="Access token" value={accessToken} onChange={setAccessToken} disabled={adding} />
                <SecretInput label="Access token secret" value={accessTokenSecret} onChange={setAccessTokenSecret} disabled={adding} />
              </div>
            ) : (
              <SecretInput
                label="Access token (OAuth 2.0 user-context)"
                value={accessToken}
                onChange={setAccessToken}
                disabled={adding}
              />
            )}

            <p
              className="rounded border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5 text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              Generate these in the X Developer Portal for the app's user context. OAuth 1.0a tokens don't expire; OAuth 2.0
              user-context tokens need refresh every 2 hours (not wired here yet).
            </p>
          </>
        ) : (
          <p
            className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {PLATFORM_LABELS[platform]} publisher isn't implemented yet — you can still store the account but publishes will fail
            with a `no_publisher` message until the adapter ships.
          </p>
        )}

        <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Notes (internal)
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={adding}
            maxLength={500}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </label>

        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {adding ? "Connecting…" : "Connect account"}
        </button>
      </form>

      {/* List */}
      {loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-6" style={{ color: "var(--muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="flex items-start gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
          No brand accounts connected yet. Add one above so compose actions (save/schedule/publish) have a destination.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 2%, transparent)" }}
            >
              <div className="min-w-0 text-xs">
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {PLATFORM_LABELS[a.platform as BrandPlatform] ?? a.platform} · @{a.handle}
                  {a.displayName ? <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>— {a.displayName}</span> : null}
                </p>
                <p style={{ color: "var(--muted)" }}>
                  {a.isActive ? "Active" : "Inactive"} · connected {new Date(a.createdAt).toLocaleDateString()}
                  {a.notes ? ` · ${a.notes}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(a)}
                  disabled={rowAction != null}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                    a.isActive
                      ? "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  } disabled:opacity-50`}
                >
                  {rowAction === `toggle-${a.id}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Power className="h-3 w-3" />
                  )}
                  {a.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => removeAccount(a)}
                  disabled={rowAction != null}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {rowAction === `delete-${a.id}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SecretInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
      {label}
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border px-2 py-2 font-mono text-xs"
        style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
      />
    </label>
  )
}
