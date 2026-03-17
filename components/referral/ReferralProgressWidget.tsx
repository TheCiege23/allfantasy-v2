"use client"

import { useCallback, useEffect, useState } from "react"
import { Trophy, UserPlus, Target } from "lucide-react"

interface Progress {
  signups: number
  clicks: number
  pendingRewards: number
  redeemedRewards: number
  tier: { id: string; label: string }
  nextMilestone: { signups: number; label: string } | null
  milestones: { signups: number; label: string; achieved: boolean }[]
}

export function ReferralProgressWidget() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProgress = useCallback(() => {
    fetch("/api/referral/progress")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.progress) setProgress(d.progress)
        else setProgress(null)
      })
      .catch(() => setProgress(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  if (loading) {
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
        <div className="h-20 animate-pulse rounded bg-black/10" />
      </div>
    )
  }

  if (!progress) return null

  const next = progress.nextMilestone
  const progressPct = next
    ? Math.min(100, (progress.signups / next.signups) * 100)
    : 100

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 40%, transparent)" }}
    >
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Target className="h-4 w-4" style={{ color: "var(--muted)" }} />
        Referral progress
      </h3>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {progress.tier.label}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {progress.signups} signup{progress.signups !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {next && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}>
            <span>Next: {next.label}</span>
            <span>{progress.signups} / {next.signups}</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--panel2)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      )}
      {!next && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Top tier reached.
        </p>
      )}
    </div>
  )
}
