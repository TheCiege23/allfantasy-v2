"use client"

import { useState, useCallback, useEffect } from "react"
import { Link2, Copy, RefreshCw, AtSign, Mail, Globe, Loader2, Check } from "lucide-react"

export interface LeagueRecruitmentToolsProps {
  leagueId: string
  /** Initial invite from parent (joinUrl, inviteCode). */
  initialInvite?: { joinUrl: string | null; inviteCode: string | null } | null
  /** Whether current user is commissioner. */
  isCommissioner: boolean
}

export function LeagueRecruitmentTools({
  leagueId,
  initialInvite,
  isCommissioner,
}: LeagueRecruitmentToolsProps) {
  const [invite, setInvite] = useState(initialInvite ?? null)
  const [loadingInvite, setLoadingInvite] = useState(!initialInvite)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [username, setUsername] = useState("")
  const [usernameSending, setUsernameSending] = useState(false)
  const [usernameResult, setUsernameResult] = useState<{ inviteUrl?: string; sentTo?: string } | null>(null)
  const [email, setEmail] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent?: boolean; inviteUrl?: string; error?: string } | null>(null)
  const [publicListing, setPublicListing] = useState(false)
  const [publicListingLoading, setPublicListingLoading] = useState(false)

  const base = `/api/commissioner/leagues/${encodeURIComponent(leagueId)}`
  const joinUrl = invite?.joinUrl ?? (invite?.inviteCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${encodeURIComponent(invite.inviteCode)}` : null)

  const fetchInvite = useCallback(async () => {
    setLoadingInvite(true)
    try {
      const res = await fetch(`${base}/invite`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setInvite({ joinUrl: data.joinUrl ?? null, inviteCode: data.inviteCode ?? null })
    } finally {
      setLoadingInvite(false)
    }
  }, [base])

  useEffect(() => {
    if (initialInvite) setInvite(initialInvite)
    else if (isCommissioner) fetchInvite()
  }, [initialInvite, isCommissioner, fetchInvite])

  const copyLink = useCallback(() => {
    if (!joinUrl) return
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [joinUrl])

  const regenerate = useCallback(async () => {
    if (!isCommissioner) return
    setRegenerating(true)
    try {
      const res = await fetch(`${base}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setInvite({ joinUrl: data.joinUrl ?? data.inviteLink ?? null, inviteCode: data.inviteCode ?? null })
    } finally {
      setRegenerating(false)
    }
  }, [base, isCommissioner])

  const sendByUsername = useCallback(async () => {
    if (!username.trim() || !isCommissioner) return
    setUsernameSending(true)
    setUsernameResult(null)
    try {
      const res = await fetch(`${base}/invite/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "username", username: username.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      setUsernameResult({ inviteUrl: data.inviteUrl, sentTo: data.sentTo })
    } finally {
      setUsernameSending(false)
    }
  }, [base, username, isCommissioner])

  const sendByEmail = useCallback(async () => {
    if (!email.trim() || !isCommissioner) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await fetch(`${base}/invite/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email", email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      setEmailResult({
        sent: data.sent,
        inviteUrl: data.inviteUrl,
        error: data.error,
      })
      if (data.sent) setEmail("")
    } finally {
      setEmailSending(false)
    }
  }, [base, email, isCommissioner])

  const togglePublicListing = useCallback(async () => {
    if (!isCommissioner) return
    const next = !publicListing
    setPublicListingLoading(true)
    try {
      const res = await fetch(`${base}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_orphan_seeking", value: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setPublicListing(data.orphanSeeking !== undefined ? !!data.orphanSeeking : next)
    } finally {
      setPublicListingLoading(false)
    }
  }, [base, isCommissioner, publicListing])

  useEffect(() => {
    if (!isCommissioner) return
    fetch(`${base}/settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings ?? {}
        setPublicListing(!!(s.orphanSeeking ?? s.publicDashboard))
      })
      .catch(() => {})
  }, [base, isCommissioner])

  if (!isCommissioner) return null

  return (
    <section className="rounded-xl border p-4 space-y-6" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 50%, transparent)" }}>
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Link2 className="h-4 w-4" style={{ color: "var(--muted)" }} />
          Recruitment tools
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Invite link, username invite, email invite, and public listing.
        </p>
      </div>

      {/* Invite link */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
          Invite link
        </h4>
        {loadingInvite ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl ?? ""}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm max-w-md"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
            />
            <button
              type="button"
              onClick={copyLink}
              disabled={!joinUrl}
              className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={regenerating}
              className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Username invite */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
          Username invite
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
            <AtSign className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Display name or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm w-48"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={sendByUsername}
            disabled={!username.trim() || usernameSending}
            className="rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {usernameSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Get invite link
          </button>
        </div>
        {usernameResult?.inviteUrl && (
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Share this link with {usernameResult.sentTo ? usernameResult.sentTo : "the user"}:{" "}
            <button type="button" onClick={() => navigator.clipboard?.writeText(usernameResult.inviteUrl!)} className="underline" style={{ color: "var(--accent)" }}>
              Copy link
            </button>
          </p>
        )}
      </div>

      {/* Email invite */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
          Email invite
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
            <Mail className="h-4 w-4" />
          </span>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm w-48"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={sendByEmail}
            disabled={!email.trim() || emailSending}
            className="rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send invite
          </button>
        </div>
        {emailResult && (
          <p className="text-xs mt-2" style={{ color: emailResult.error ? "var(--destructive)" : "var(--muted)" }}>
            {emailResult.sent ? "Invite email sent." : emailResult.error ? emailResult.error : "Share this link: " + (emailResult.inviteUrl ?? "")}
          </p>
        )}
      </div>

      {/* Public listing */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
          Public listing
        </h4>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-4 w-4" style={{ color: "var(--muted)" }} />
          </span>
          <input
            type="checkbox"
            checked={publicListing}
            onChange={togglePublicListing}
            disabled={publicListingLoading}
            className="rounded border"
            style={{ borderColor: "var(--border)" }}
          />
          List league publicly (e.g. find a league / orphan seeking)
        </label>
      </div>
    </section>
  )
}
