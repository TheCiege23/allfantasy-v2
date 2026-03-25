"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Copy, Check, Share2, Users, UserPlus, Gift, Loader2 } from "lucide-react"
import { buildInviteShareUrl } from "@/lib/invite-engine/shareUrls"
import { ReferralShareBar } from "@/components/referral/ReferralShareBar"

type Stats = { clicks: number; signups: number; pendingRewards: number; redeemedRewards: number }
type Reward = { id: string; type: string; label: string; status: string; grantedAt: string; redeemedAt: string | null }

export function ReferralSection() {
  const [code, setCode] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [linkRes, statsRes, rewardsRes] = await Promise.all([
          fetch("/api/referral/link"),
          fetch("/api/referral/stats"),
          fetch("/api/referral/rewards"),
        ])
        if (cancelled) return
        if (linkRes.ok) {
          const d = await linkRes.json()
          if (d.code) setCode(d.code)
          if (d.link) setLink(d.link)
        }
        if (statsRes.ok) {
          const d = await statsRes.json()
          if (d.stats) setStats(d.stats)
        }
        if (rewardsRes.ok) {
          const d = await rewardsRes.json()
          if (Array.isArray(d.rewards)) setRewards(d.rewards)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const copyLink = () => {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const copyCode = () => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const redeem = async (rewardId: string) => {
    setRedeemingId(rewardId)
    try {
      const res = await fetch("/api/referral/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setRewards((prev) =>
          prev.map((r) => (r.id === rewardId ? { ...r, status: "redeemed" as const, redeemedAt: new Date().toISOString() } : r))
        )
        setStats((prev) =>
          prev
            ? {
                ...prev,
                pendingRewards: Math.max(0, prev.pendingRewards - 1),
                redeemedRewards: prev.redeemedRewards + 1,
              }
            : null
        )
      }
    } finally {
      setRedeemingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Refer friends
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Share your link. When friends sign up, you earn rewards.
        </p>
      </div>

      {(code || link) && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 60%, transparent)" }}>
          {code && (
            <>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Your referral code
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={code}
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={copyCode}
                  data-testid="referral-copy-code"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCode ? "Copied" : "Copy code"}
                </button>
              </div>
            </>
          )}
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            Your referral link
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={link ?? ""}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
            <button
              type="button"
              onClick={copyLink}
              data-testid="referral-copy-link"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedLink ? "Copied" : "Copy link"}
            </button>
          </div>
          {link && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <ReferralShareBar referralLink={link} testIdPrefix="referral-share" />
            </div>
          )}
        </div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div data-testid="referral-stat-clicks" className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: "var(--muted)" }} />
              <span className="text-sm" style={{ color: "var(--muted)" }}>Clicks</span>
            </div>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--text)" }}>{stats.clicks}</p>
          </div>
          <div data-testid="referral-stat-signups" className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" style={{ color: "var(--muted)" }} />
              <span className="text-sm" style={{ color: "var(--muted)" }}>Signups</span>
            </div>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--text)" }}>{stats.signups}</p>
          </div>
          <div data-testid="referral-stat-pending-rewards" className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" style={{ color: "var(--muted)" }} />
              <span className="text-sm" style={{ color: "var(--muted)" }}>Pending rewards</span>
            </div>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--text)" }}>{stats.pendingRewards}</p>
          </div>
          <div data-testid="referral-stat-redeemed-rewards" className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--muted)" }}>Redeemed</span>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--text)" }}>{stats.redeemedRewards}</p>
          </div>
        </div>
      )}

      {rewards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
            Rewards
          </h3>
          <ul className="space-y-2">
            {rewards.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <span className="font-medium" style={{ color: "var(--text)" }}>{r.label}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
                    {r.status === "redeemed" ? "Redeemed" : "Pending"}
                  </span>
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    disabled={redeemingId === r.id}
                    onClick={() => redeem(r.id)}
                    data-testid={`referral-redeem-${r.id}`}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    {redeemingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!link && !code && !loading && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Could not load referral link. <Link href="/referral" className="underline">Open referral dashboard</Link> or try refreshing.
        </p>
      )}
    </div>
  )
}
